'use server';

import { signIn, signOut } from '@/auth';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import { AuthError } from 'next-auth';
import { headers } from 'next/headers';
import { redirect } from 'next/navigation';
import { prisma } from '@/lib/prisma';
import { sendPasswordResetEmail } from '@/lib/email';
import { mainUrl } from '@/lib/url';
import { checkRateLimit, signInLimiter, signUpLimiter, forgotPasswordLimiter } from '@/lib/rate-limit';
import { signUpSchema, signInSchema, forgotPasswordSchema, resetPasswordSchema } from '@/lib/validations/auth';

export async function signUpAction(formData: FormData) {
  const raw = {
    firstName: formData.get('firstName'),
    lastName: formData.get('lastName'),
    email: formData.get('email'),
    password: formData.get('password'),
    redirectTo: formData.get('redirectTo') || undefined,
  };

  const parsed = signUpSchema.safeParse(raw);
  if (!parsed.success) {
    return { error: parsed.error.issues[0].message };
  }

  const { firstName, lastName, email, password, redirectTo } = parsed.data;

  const headersList = await headers();
  const ip = headersList.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown';
  const rateLimited = await checkRateLimit(signUpLimiter, ip);
  if (rateLimited) return rateLimited;

  // Check if user already exists
  const existingUser = await prisma.user.findUnique({
    where: { email },
  });

  if (existingUser) {
    return { error: 'User with this email already exists' };
  }

  // Hash password
  const hashedPassword = await bcrypt.hash(password, 10);

  // Create user
  try {
    await prisma.user.create({
      data: {
        firstName,
        lastName,
        email,
        password: hashedPassword,
      },
    });
  } catch (error) {
    console.error('Signup error:', error);
    return { error: 'Something went wrong. Please try again.' };
  }

  // Sign in the user after successful registration
  await signIn('credentials', {
    email,
    password,
    redirectTo: redirectTo || '/account',
  });
}

export async function signInAction(formData: FormData) {
  const raw = {
    email: formData.get('email'),
    password: formData.get('password'),
    callbackUrl: formData.get('callbackUrl') || undefined,
  };

  const parsed = signInSchema.safeParse(raw);
  if (!parsed.success) {
    return { error: parsed.error.issues[0].message };
  }

  const { email, password, callbackUrl } = parsed.data;

  const rateLimited = await checkRateLimit(signInLimiter, email.toLowerCase());
  if (rateLimited) return rateLimited;

  try {
    await signIn('credentials', {
      email,
      password,
      redirectTo: callbackUrl || '/account',
    });
  } catch (error) {
    if (error instanceof AuthError) {
      switch (error.type) {
        case 'CredentialsSignin':
          return { error: 'Invalid email or password' };
        default:
          return { error: 'Something went wrong. Please try again.' };
      }
    }
    throw error;
  }
}

export async function signOutAction() {
  await signOut({ redirect: true, redirectTo: '/' });
}

export async function forgotPasswordAction(formData: FormData) {
  const raw = { email: formData.get('email') };

  const parsed = forgotPasswordSchema.safeParse(raw);
  if (!parsed.success) {
    return { error: parsed.error.issues[0].message };
  }

  const { email } = parsed.data;

  const rateLimited = await checkRateLimit(forgotPasswordLimiter, email);
  if (rateLimited) return rateLimited;

  // Always return success to prevent email enumeration
  const successMessage = 'If an account exists with that email, we sent a password reset link.';

  try {
    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) {
      return { success: successMessage };
    }

    // Delete any existing tokens for this email
    await prisma.passwordResetToken.deleteMany({ where: { email } });

    // Create new token
    const token = crypto.randomUUID();
    await prisma.passwordResetToken.create({
      data: {
        email,
        token,
        expires: new Date(Date.now() + 60 * 60 * 1000), // 1 hour
      },
    });

    const resetUrl = mainUrl(`/auth/reset-password/${token}`);
    await sendPasswordResetEmail({ to: email, resetUrl });

    return { success: successMessage };
  } catch (error) {
    console.error('Forgot password error:', error);
    return { error: 'Something went wrong. Please try again.' };
  }
}

export async function resetPasswordAction(formData: FormData) {
  const raw = {
    token: formData.get('token'),
    password: formData.get('password'),
  };

  const parsed = resetPasswordSchema.safeParse(raw);
  if (!parsed.success) {
    return { error: parsed.error.issues[0].message };
  }

  const { token, password } = parsed.data;

  try {
    const resetToken = await prisma.passwordResetToken.findUnique({
      where: { token },
    });

    if (!resetToken) {
      return { error: 'Invalid or expired reset link' };
    }

    if (resetToken.expires < new Date()) {
      await prisma.passwordResetToken.delete({ where: { id: resetToken.id } });
      return { error: 'Reset link has expired. Please request a new one.' };
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    await prisma.user.update({
      where: { email: resetToken.email },
      data: { password: hashedPassword },
    });

    // Clean up token
    await prisma.passwordResetToken.delete({ where: { id: resetToken.id } });
  } catch (error) {
    console.error('Reset password error:', error);
    return { error: 'Something went wrong. Please try again.' };
  }

  redirect('/auth/signin?message=Password reset successfully. Please sign in.');
}
