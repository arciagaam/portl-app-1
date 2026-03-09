'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { ChevronDown, ChevronUp, User } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { CheckoutOrderWithRelations as OrderWithRelations } from '@/lib/types/order';

interface AttendeeFormProps {
  order: OrderWithRelations;
  userEmail?: string;
  userName?: string;
  onContinue: (attendees: AttendeeData[]) => void;
  onBack: () => void;
}

export interface AttendeeData {
  firstName: string;
  lastName: string;
  email: string;
  phone?: string;
}

const attendeeSchema = z.object({
  firstName: z.string().min(1, 'First name is required'),
  lastName: z.string().min(1, 'Last name is required'),
  email: z.string().email('Valid email is required'),
  phone: z.string().optional(),
});

type AttendeeFormData = z.infer<typeof attendeeSchema>;

export function AttendeeForm({
  order,
  userEmail,
  userName,
  onContinue,
  onBack,
}: AttendeeFormProps) {
  // Calculate total tickets
  const totalTickets = order.items.reduce((sum, item) => sum + item.quantity, 0);

  // Initialize attendees state
  const [attendees, setAttendees] = useState<AttendeeData[]>(() =>
    Array.from({ length: totalTickets }, () => ({
      firstName: '',
      lastName: '',
      email: '',
      phone: '',
    }))
  );

  const [expandedIndex, setExpandedIndex] = useState<number | null>(0);
  const [errors, setErrors] = useState<Record<number, Record<string, string>>>({});

  // Parse user name
  const [userFirstName, userLastName] = (userName || '').split(' ').length >= 2
    ? (userName || '').split(' ')
    : [userName || '', ''];

  const handleIAmAttendee = (index: number) => {
    const newAttendees = [...attendees];
    newAttendees[index] = {
      firstName: userFirstName,
      lastName: userLastName,
      email: userEmail || '',
      phone: '',
    };
    setAttendees(newAttendees);
    setErrors((prev) => ({ ...prev, [index]: {} }));
  };

  const handleFieldChange = (
    index: number,
    field: keyof AttendeeData,
    value: string
  ) => {
    const newAttendees = [...attendees];
    newAttendees[index] = { ...newAttendees[index], [field]: value };
    setAttendees(newAttendees);

    // Clear error for this field
    if (errors[index]?.[field]) {
      setErrors((prev) => ({
        ...prev,
        [index]: { ...prev[index], [field]: '' },
      }));
    }
  };

  const validateAttendees = (): boolean => {
    const newErrors: Record<number, Record<string, string>> = {};
    let isValid = true;

    attendees.forEach((attendee, index) => {
      const result = attendeeSchema.safeParse(attendee);
      if (!result.success) {
        isValid = false;
        newErrors[index] = {};
        result.error.issues.forEach((issue) => {
          const field = issue.path[0] as string;
          newErrors[index][field] = issue.message;
        });
      }
    });

    setErrors(newErrors);
    return isValid;
  };

  const handleContinue = () => {
    if (validateAttendees()) {
      onContinue(attendees);
    }
  };

  // Generate ticket labels
  const getTicketLabel = (ticketIndex: number): string => {
    let count = 0;
    for (const item of order.items) {
      for (let i = 0; i < item.quantity; i++) {
        if (count === ticketIndex) {
          return `${item.ticketType.name}${item.quantity > 1 ? ` #${i + 1}` : ''}`;
        }
        count++;
      }
    }
    return `Ticket ${ticketIndex + 1}`;
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Attendee Information</CardTitle>
          <p className="text-sm text-muted-foreground">
            Enter details for each ticket holder. This information will appear on their tickets.
          </p>
        </CardHeader>
        <CardContent className="space-y-4">
          {attendees.map((attendee, index) => {
            const isExpanded = expandedIndex === index;
            const hasErrors = Object.keys(errors[index] || {}).length > 0;
            const isComplete =
              attendee.firstName && attendee.lastName && attendee.email;

            return (
              <div
                key={index}
                className={cn(
                  'border rounded-lg overflow-hidden',
                  hasErrors && 'border-destructive'
                )}
              >
                <button
                  type="button"
                  onClick={() => setExpandedIndex(isExpanded ? null : index)}
                  className="w-full flex items-center justify-between p-4 text-left hover:bg-muted/50 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <div
                      className={cn(
                        'h-8 w-8 rounded-full flex items-center justify-center',
                        isComplete
                          ? 'bg-primary text-primary-foreground'
                          : 'bg-muted text-muted-foreground'
                      )}
                    >
                      <User className="h-4 w-4" />
                    </div>
                    <div>
                      <p className="font-medium">{getTicketLabel(index)}</p>
                      {isComplete && (
                        <p className="text-sm text-muted-foreground">
                          {attendee.firstName} {attendee.lastName}
                        </p>
                      )}
                    </div>
                  </div>
                  {isExpanded ? (
                    <ChevronUp className="h-5 w-5 text-muted-foreground" />
                  ) : (
                    <ChevronDown className="h-5 w-5 text-muted-foreground" />
                  )}
                </button>

                {isExpanded && (
                  <div className="p-4 pt-0 space-y-4">
                    {/* I am the attendee button */}
                    {userEmail && (
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => handleIAmAttendee(index)}
                        className="w-full"
                      >
                        I am the attendee
                      </Button>
                    )}

                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor={`firstName-${index}`}>First Name</Label>
                        <Input
                          id={`firstName-${index}`}
                          value={attendee.firstName}
                          onChange={(e) =>
                            handleFieldChange(index, 'firstName', e.target.value)
                          }
                          placeholder="John"
                        />
                        {errors[index]?.firstName && (
                          <p className="text-xs text-destructive">
                            {errors[index].firstName}
                          </p>
                        )}
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor={`lastName-${index}`}>Last Name</Label>
                        <Input
                          id={`lastName-${index}`}
                          value={attendee.lastName}
                          onChange={(e) =>
                            handleFieldChange(index, 'lastName', e.target.value)
                          }
                          placeholder="Doe"
                        />
                        {errors[index]?.lastName && (
                          <p className="text-xs text-destructive">
                            {errors[index].lastName}
                          </p>
                        )}
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor={`email-${index}`}>Email</Label>
                      <Input
                        id={`email-${index}`}
                        type="email"
                        value={attendee.email}
                        onChange={(e) =>
                          handleFieldChange(index, 'email', e.target.value)
                        }
                        placeholder="john@example.com"
                      />
                      {errors[index]?.email && (
                        <p className="text-xs text-destructive">
                          {errors[index].email}
                        </p>
                      )}
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor={`phone-${index}`}>Phone (Optional)</Label>
                      <Input
                        id={`phone-${index}`}
                        type="tel"
                        value={attendee.phone || ''}
                        onChange={(e) =>
                          handleFieldChange(index, 'phone', e.target.value)
                        }
                        placeholder="+63 912 345 6789"
                      />
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </CardContent>
      </Card>

      <div className="flex gap-4">
        <Button variant="outline" className="flex-1" onClick={onBack}>
          Back
        </Button>
        <Button className="flex-1" onClick={handleContinue}>
          Continue to Payment
        </Button>
      </div>
    </div>
  );
}
