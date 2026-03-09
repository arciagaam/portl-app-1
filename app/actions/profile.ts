'use server';

import { revalidatePath } from 'next/cache';
import bcrypt from 'bcryptjs';
import { prisma } from '@/lib/prisma';
import { getCurrentUser } from '@/lib/auth';
import { updateProfileSchema, updatePasswordSchema } from '@/lib/validations/profile';

export async function updateProfileAction(formData: FormData) {
  const user = await getCurrentUser();

  if (!user?.id) {
    return { error: 'You must be logged in to update your profile' };
  }

  const raw = {
    firstName: formData.get('firstName'),
    lastName: formData.get('lastName'),
    email: formData.get('email'),
    image: formData.get('image') as string | null,
  };

  const parsed = updateProfileSchema.safeParse(raw);
  if (!parsed.success) {
    return { error: parsed.error.issues[0].message };
  }

  const { firstName, lastName, email, image } = parsed.data;

  // Check if email is taken by another user
  if (email !== user.email) {
    const existingUser = await prisma.user.findUnique({
      where: { email },
    });

    if (existingUser && existingUser.id !== user.id) {
      return { error: 'Email is already taken' };
    }
  }

  try {
    await prisma.user.update({
      where: { id: user.id },
      data: {
        firstName,
        lastName,
        email,
        ...(image !== undefined && { image: image || null }),
      },
    });

    revalidatePath('/[tenant]/profile');
    revalidatePath('/account/settings');
    return { success: true };
  } catch (error) {
    console.error('Profile update error:', error);
    return { error: 'Failed to update profile. Please try again.' };
  }
}

export async function updatePasswordAction(formData: FormData) {
  const user = await getCurrentUser();

  if (!user?.id) {
    return { error: 'You must be logged in to update your password' };
  }

  const raw = {
    currentPassword: formData.get('currentPassword'),
    newPassword: formData.get('newPassword'),
    confirmPassword: formData.get('confirmPassword'),
  };

  const parsed = updatePasswordSchema.safeParse(raw);
  if (!parsed.success) {
    return { error: parsed.error.issues[0].message };
  }

  const { currentPassword, newPassword } = parsed.data;

  // Get user with password
  const dbUser = await prisma.user.findUnique({
    where: { id: user.id },
  });

  if (!dbUser || !dbUser.password) {
    return { error: 'Invalid user' };
  }

  // Verify current password
  const isValid = await bcrypt.compare(currentPassword, dbUser.password);
  if (!isValid) {
    return { error: 'Current password is incorrect' };
  }

  // Hash new password
  const hashedPassword = await bcrypt.hash(newPassword, 10);

  try {
    await prisma.user.update({
      where: { id: user.id },
      data: {
        password: hashedPassword,
      },
    });

    return { success: true };
  } catch (error) {
    console.error('Password update error:', error);
    return { error: 'Failed to update password. Please try again.' };
  }
}
