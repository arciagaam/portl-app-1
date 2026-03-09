'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent } from '@/components/ui/card';
import { FileUpload } from '@/components/ui/file-upload';
import { Plus, Trash2 } from 'lucide-react';

export interface PastEvent {
  name: string;
  date: string;
  photos: (string | File)[]; // URLs or pending Files - max 10
  videoLinks: string[]; // max 10
  estimatedAttendance?: string;
  pressCoverage?: string; // Media mentions
}

interface PastEventsFormProps {
  initialData?: PastEvent[];
  onChange: (events: PastEvent[]) => void;
}

export function PastEventsForm({ initialData, onChange }: PastEventsFormProps) {
  const [events, setEvents] = useState<PastEvent[]>(
    initialData && initialData.length > 0
      ? initialData
      : [{ name: '', date: '', photos: [], videoLinks: [], estimatedAttendance: '', pressCoverage: '' }]
  );

  const updateEvent = (index: number, field: keyof PastEvent, value: string | (string | File)[]) => {
    const newEvents = [...events];
    newEvents[index] = { ...newEvents[index], [field]: value };
    setEvents(newEvents);
    onChange(newEvents);
  };

  const addEvent = () => {
    if (events.length >= 10) return;
    const newEvents = [...events, { name: '', date: '', photos: [], videoLinks: [], estimatedAttendance: '', pressCoverage: '' }];
    setEvents(newEvents);
    onChange(newEvents);
  };

  const removeEvent = (index: number) => {
    if (events.length <= 1) return;
    const newEvents = events.filter((_, i) => i !== index);
    setEvents(newEvents);
    onChange(newEvents);
  };

  const handlePhotoAdded = (eventIndex: number, val: string | File) => {
    const event = events[eventIndex];
    if (event.photos.length >= 10) return;
    const newPhotos = [...event.photos, val];
    updateEvent(eventIndex, 'photos', newPhotos);
  };

  const handlePhotoChanged = (eventIndex: number, photoIndex: number, val: string | File | undefined) => {
    const event = events[eventIndex];
    const newPhotos = [...event.photos];
    if (val) {
      newPhotos[photoIndex] = val;
    } else {
      newPhotos.splice(photoIndex, 1);
    }
    updateEvent(eventIndex, 'photos', newPhotos);
  };

  const addVideoLink = (eventIndex: number, videoUrl: string) => {
    const event = events[eventIndex];
    if (event.videoLinks.length >= 10) return;
    const newVideoLinks = [...event.videoLinks, videoUrl];
    updateEvent(eventIndex, 'videoLinks', newVideoLinks);
  };

  const removeVideoLink = (eventIndex: number, videoIndex: number) => {
    const event = events[eventIndex];
    const newVideoLinks = event.videoLinks.filter((_, i) => i !== videoIndex);
    updateEvent(eventIndex, 'videoLinks', newVideoLinks);
  };

  return (
    <div className="space-y-4">
      {events.map((event, eventIndex) => (
        <Card key={eventIndex}>
          <CardContent className="pt-6 space-y-4">
            <div className="flex justify-between items-center">
              <h3 className="font-medium">Past Event {eventIndex + 1}</h3>
              {events.length > 1 && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => removeEvent(eventIndex)}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor={`event-name-${eventIndex}`}>Event Name</Label>
              <Input
                id={`event-name-${eventIndex}`}
                placeholder="e.g., Tech Conference 2024"
                value={event.name}
                onChange={(e) => updateEvent(eventIndex, 'name', e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor={`event-date-${eventIndex}`}>Date</Label>
              <Input
                id={`event-date-${eventIndex}`}
                type="date"
                value={event.date}
                onChange={(e) => updateEvent(eventIndex, 'date', e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label>Event Photos (up to 10)</Label>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {event.photos.map((photo, photoIndex) => (
                  <FileUpload
                    key={`${eventIndex}-photo-${photoIndex}`}
                    value={photo}
                    onChange={(val) => handlePhotoChanged(eventIndex, photoIndex, val)}
                  />
                ))}
                {event.photos.length < 10 && (
                  <FileUpload
                    key={`${eventIndex}-photo-new-${event.photos.length}`}
                    value={undefined}
                    onChange={(val) => {
                      if (val) handlePhotoAdded(eventIndex, val);
                    }}
                  />
                )}
              </div>
              <p className="text-xs text-muted-foreground">
                {event.photos.length}/10 photos
              </p>
            </div>

            <div className="space-y-2">
              <Label>Event Video Links (up to 10)</Label>
              <div className="space-y-2">
                {event.videoLinks.map((video, videoIndex) => (
                  <div key={videoIndex} className="flex items-center gap-2">
                    <Input
                      placeholder="Video URL (YouTube, Vimeo, etc.)"
                      value={video}
                      onChange={(e) => {
                        const newVideoLinks = [...event.videoLinks];
                        newVideoLinks[videoIndex] = e.target.value;
                        updateEvent(eventIndex, 'videoLinks', newVideoLinks);
                      }}
                    />
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => removeVideoLink(eventIndex, videoIndex)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
                {event.videoLinks.length < 10 && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => addVideoLink(eventIndex, '')}
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Add Video Link
                  </Button>
                )}
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor={`attendance-${eventIndex}`}>Estimated Attendance</Label>
              <Input
                id={`attendance-${eventIndex}`}
                placeholder="e.g., 500, 1000-2000"
                value={event.estimatedAttendance || ''}
                onChange={(e) => updateEvent(eventIndex, 'estimatedAttendance', e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor={`press-${eventIndex}`}>Press Coverage / Media Mentions</Label>
              <Textarea
                id={`press-${eventIndex}`}
                placeholder="List any media coverage, press mentions, or articles about this event"
                value={event.pressCoverage || ''}
                onChange={(e) => updateEvent(eventIndex, 'pressCoverage', e.target.value)}
                rows={3}
              />
            </div>
          </CardContent>
        </Card>
      ))}

      {events.length < 10 && (
        <Button variant="outline" onClick={addEvent} className="w-full">
          <Plus className="h-4 w-4 mr-2" />
          Add Another Event
        </Button>
      )}
    </div>
  );
}
