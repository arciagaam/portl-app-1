'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { eventSchema, type EventFormData } from '@/lib/validations/events';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { FileUpload } from '@/components/ui/file-upload';
import { CheckCircle2, AlertCircle } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { uploadPendingFile } from '@/lib/upload';

interface EventFormProps {
  tenantSubdomain: string;
  defaultValues?: Partial<EventFormData>;
  eventId?: string;
  onSubmit: (data: EventFormData) => Promise<{ error?: string; data?: { id: string } }>;
}

export function EventForm({ tenantSubdomain, defaultValues, eventId, onSubmit }: EventFormProps) {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [thumbnailFile, setThumbnailFile] = useState<string | File | undefined>(
    defaultValues?.thumbnailUrl ?? undefined
  );

  const {
    register,
    handleSubmit,
    formState: { errors },
    setValue,
    watch,
  } = useForm<EventFormData>({
    resolver: zodResolver(eventSchema),
    defaultValues: defaultValues || {
      status: 'DRAFT',
    },
  });

  const status = watch('status');

  const onSubmitForm = async (data: EventFormData) => {
    setIsLoading(true);
    setMessage(null);

    try {
      const thumbnailUrl = await uploadPendingFile(thumbnailFile, 'events/thumbnails');
      data.thumbnailUrl = thumbnailUrl ?? null;
    } catch {
      setIsLoading(false);
      setMessage({ type: 'error', text: 'Failed to upload thumbnail. Please try again.' });
      toast.error('Failed to upload thumbnail');
      return;
    }

    const result = await onSubmit(data);

    setIsLoading(false);

    if (result.error) {
      setMessage({ type: 'error', text: result.error });
      toast.error(result.error);
    } else if (result.data) {
      setMessage({ type: 'success', text: eventId ? 'Event updated successfully!' : 'Event created successfully!' });
      toast.success(eventId ? 'Event updated successfully!' : 'Event created successfully!');
      router.push(`/dashboard/${tenantSubdomain}/events/${result.data.id}`);
      router.refresh();
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmitForm)} className="space-y-6">
      {message && (
        <div
          className={`rounded-lg border p-4 ${
            message.type === 'success'
              ? 'border-green-200 bg-green-50 text-green-800'
              : 'border-red-200 bg-red-50 text-red-800'
          }`}
        >
          <div className="flex items-center gap-3">
            {message.type === 'success' ? (
              <CheckCircle2 className="h-5 w-5 flex-shrink-0" />
            ) : (
              <AlertCircle className="h-5 w-5 flex-shrink-0" />
            )}
            <div className="text-sm">{message.text}</div>
          </div>
        </div>
      )}

      <FileUpload
        label="Event Thumbnail"
        description="Optional. If not set, the first gallery image will be used."
        value={thumbnailFile}
        onChange={(val) => setThumbnailFile(val)}
        disabled={isLoading}
      />

      <div className="space-y-2">
        <Label htmlFor="name">Event Name *</Label>
        <Input
          id="name"
          {...register('name')}
          disabled={isLoading}
          className={errors.name ? 'border-red-500' : ''}
        />
        {errors.name && (
          <p className="text-sm text-red-600">{errors.name.message}</p>
        )}
      </div>

      <div className="space-y-2">
        <Label htmlFor="description">Description</Label>
        <Textarea
          id="description"
          {...register('description')}
          disabled={isLoading}
          rows={4}
          className={errors.description ? 'border-red-500' : ''}
        />
        {errors.description && (
          <p className="text-sm text-red-600">{errors.description.message}</p>
        )}
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="venueName">Venue Name *</Label>
          <Input
            id="venueName"
            {...register('venueName')}
            disabled={isLoading}
            className={errors.venueName ? 'border-red-500' : ''}
          />
          {errors.venueName && (
            <p className="text-sm text-red-600">{errors.venueName.message}</p>
          )}
        </div>

        <div className="space-y-2">
          <Label htmlFor="venueAddress">Venue Address</Label>
          <Input
            id="venueAddress"
            {...register('venueAddress')}
            disabled={isLoading}
            className={errors.venueAddress ? 'border-red-500' : ''}
          />
          {errors.venueAddress && (
            <p className="text-sm text-red-600">{errors.venueAddress.message}</p>
          )}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="startDate">Start Date *</Label>
          <Input
            id="startDate"
            type="date"
            {...register('startDate')}
            disabled={isLoading}
            className={errors.startDate ? 'border-red-500' : ''}
          />
          {errors.startDate && (
            <p className="text-sm text-red-600">{errors.startDate.message}</p>
          )}
        </div>

        <div className="space-y-2">
          <Label htmlFor="startTime">Start Time *</Label>
          <Input
            id="startTime"
            type="time"
            {...register('startTime')}
            disabled={isLoading}
            className={errors.startTime ? 'border-red-500' : ''}
          />
          {errors.startTime && (
            <p className="text-sm text-red-600">{errors.startTime.message}</p>
          )}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="endDate">End Date *</Label>
          <Input
            id="endDate"
            type="date"
            {...register('endDate')}
            disabled={isLoading}
            className={errors.endDate ? 'border-red-500' : ''}
          />
          {errors.endDate && (
            <p className="text-sm text-red-600">{errors.endDate.message}</p>
          )}
        </div>

        <div className="space-y-2">
          <Label htmlFor="endTime">End Time *</Label>
          <Input
            id="endTime"
            type="time"
            {...register('endTime')}
            disabled={isLoading}
            className={errors.endTime ? 'border-red-500' : ''}
          />
          {errors.endTime && (
            <p className="text-sm text-red-600">{errors.endTime.message}</p>
          )}
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="status">Status *</Label>
        <Select
          value={status}
          onValueChange={(value) => setValue('status', value as 'DRAFT' | 'PUBLISHED' | 'ARCHIVED')}
          disabled={isLoading}
        >
          <SelectTrigger className={errors.status ? 'border-red-500' : ''}>
            <SelectValue placeholder="Select status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="DRAFT">Draft</SelectItem>
            <SelectItem value="PUBLISHED">Published</SelectItem>
            <SelectItem value="ARCHIVED">Archived</SelectItem>
          </SelectContent>
        </Select>
        {errors.status && (
          <p className="text-sm text-red-600">{errors.status.message}</p>
        )}
      </div>

      <div className="flex justify-end gap-2 pt-4">
        <Button
          type="button"
          variant="outline"
          onClick={() => router.back()}
          disabled={isLoading}
        >
          Cancel
        </Button>
        <Button type="submit" disabled={isLoading}>
          {isLoading ? 'Saving...' : eventId ? 'Update Event' : 'Create Event'}
        </Button>
      </div>
    </form>
  );
}
