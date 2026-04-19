'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Pencil, X, Loader2 } from 'lucide-react';
import { assignTicketHolderAction } from '@/app/actions/orders';

const attendeeSchema = z.object({
  firstName: z.string().min(1, 'First name is required'),
  lastName: z.string().min(1, 'Last name is required'),
  email: z.string().email('Invalid email address'),
  phone: z.string().optional(),
});

type AttendeeFormData = z.infer<typeof attendeeSchema>;

interface EditAttendeeFormProps {
  ticketId: string;
  currentAttendee: {
    firstName: string | null;
    lastName: string | null;
    email: string | null;
    phone: string | null;
  };
  canEdit: boolean;
}

export function EditAttendeeForm({ ticketId, currentAttendee, canEdit }: EditAttendeeFormProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<AttendeeFormData>({
    resolver: zodResolver(attendeeSchema),
    defaultValues: {
      firstName: currentAttendee.firstName ?? '',
      lastName: currentAttendee.lastName ?? '',
      email: currentAttendee.email ?? '',
      phone: currentAttendee.phone ?? '',
    },
  });

  async function onSubmit(data: AttendeeFormData) {
    setError(null);
    const result = await assignTicketHolderAction(ticketId, {
      firstName: data.firstName,
      lastName: data.lastName,
      email: data.email,
      phone: data.phone || null,
    });

    if ('error' in result) {
      setError(result.error);
      return;
    }

    setIsEditing(false);
  }

  if (!isEditing) {
    return (
      <div>
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <h3 className="font-semibold">Attendee</h3>
          </div>
          {canEdit && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setIsEditing(true)}
            >
              <Pencil className="h-4 w-4 mr-1" />
              Edit
            </Button>
          )}
        </div>
        {currentAttendee.firstName ? (
          <div className="space-y-1">
            <p className="font-medium">
              {currentAttendee.firstName} {currentAttendee.lastName}
            </p>
            {currentAttendee.email && (
              <p className="text-sm text-muted-foreground">{currentAttendee.email}</p>
            )}
            {currentAttendee.phone && (
              <p className="text-sm text-muted-foreground">{currentAttendee.phone}</p>
            )}
          </div>
        ) : (
          <p className="text-muted-foreground">No attendee assigned yet</p>
        )}
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <h3 className="font-semibold">Edit Attendee</h3>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => {
            setIsEditing(false);
            setError(null);
            reset();
          }}
        >
          <X className="h-4 w-4 mr-1" />
          Cancel
        </Button>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-3">
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1">
            <Label htmlFor="firstName">First Name</Label>
            <Input id="firstName" {...register('firstName')} />
            {errors.firstName && (
              <p className="text-xs text-destructive">{errors.firstName.message}</p>
            )}
          </div>
          <div className="space-y-1">
            <Label htmlFor="lastName">Last Name</Label>
            <Input id="lastName" {...register('lastName')} />
            {errors.lastName && (
              <p className="text-xs text-destructive">{errors.lastName.message}</p>
            )}
          </div>
        </div>

        <div className="space-y-1">
          <Label htmlFor="email">Email</Label>
          <Input id="email" type="email" {...register('email')} />
          {errors.email && (
            <p className="text-xs text-destructive">{errors.email.message}</p>
          )}
        </div>

        <div className="space-y-1">
          <Label htmlFor="phone">Phone (optional)</Label>
          <Input id="phone" type="tel" {...register('phone')} />
        </div>

        {error && (
          <p className="text-sm text-destructive">{error}</p>
        )}

        <Button type="submit" size="sm" disabled={isSubmitting}>
          {isSubmitting && <Loader2 className="h-4 w-4 mr-1 animate-spin" />}
          Save Changes
        </Button>
      </form>
    </div>
  );
}
