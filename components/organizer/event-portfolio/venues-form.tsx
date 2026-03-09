'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { FileUpload } from '@/components/ui/file-upload';
import { Plus, Trash2 } from 'lucide-react';

export interface Venue {
  name: string;
  relationship: 'owner' | 'partner' | 'renter';
  images: (string | File)[]; // URLs or pending Files - max 2
}

interface VenuesFormProps {
  initialData?: Venue[];
  onChange: (venues: Venue[]) => void;
}

export function VenuesForm({ initialData, onChange }: VenuesFormProps) {
  const [venues, setVenues] = useState<Venue[]>(
    initialData && initialData.length > 0
      ? initialData
      : [{ name: '', relationship: 'renter', images: [] }]
  );

  const updateVenue = (index: number, field: keyof Venue, value: string | (string | File)[]) => {
    const newVenues = [...venues];
    newVenues[index] = { ...newVenues[index], [field]: value };
    setVenues(newVenues);
    onChange(newVenues);
  };

  const addVenue = () => {
    if (venues.length >= 10) return;
    const newVenues = [...venues, { name: '', relationship: 'renter' as const, images: [] }];
    setVenues(newVenues);
    onChange(newVenues);
  };

  const removeVenue = (index: number) => {
    if (venues.length <= 1) return;
    const newVenues = venues.filter((_, i) => i !== index);
    setVenues(newVenues);
    onChange(newVenues);
  };

  const handleImageAdded = (venueIndex: number, val: string | File) => {
    const venue = venues[venueIndex];
    if (venue.images.length >= 2) return;
    const newImages = [...venue.images, val];
    updateVenue(venueIndex, 'images', newImages);
  };

  const handleImageChanged = (venueIndex: number, imageIndex: number, val: string | File | undefined) => {
    const venue = venues[venueIndex];
    const newImages = [...venue.images];
    if (val) {
      newImages[imageIndex] = val;
    } else {
      newImages.splice(imageIndex, 1);
    }
    updateVenue(venueIndex, 'images', newImages);
  };

  return (
    <div className="space-y-4">
      {venues.map((venue, venueIndex) => (
        <Card key={venueIndex}>
          <CardContent className="pt-6 space-y-4">
            <div className="flex justify-between items-center">
              <h3 className="font-medium">Venue {venueIndex + 1}</h3>
              {venues.length > 1 && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => removeVenue(venueIndex)}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor={`venue-name-${venueIndex}`}>Venue Name</Label>
              <Input
                id={`venue-name-${venueIndex}`}
                placeholder="e.g., Grand Convention Center"
                value={venue.name}
                onChange={(e) => updateVenue(venueIndex, 'name', e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor={`venue-relationship-${venueIndex}`}>Relationship</Label>
              <Select
                value={venue.relationship}
                onValueChange={(value) => updateVenue(venueIndex, 'relationship', value as 'owner' | 'partner' | 'renter')}
              >
                <SelectTrigger id={`venue-relationship-${venueIndex}`}>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="owner">Owner</SelectItem>
                  <SelectItem value="partner">Partner</SelectItem>
                  <SelectItem value="renter">Renter</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Venue Images (up to 2)</Label>
              <div className="grid grid-cols-2 gap-3">
                {venue.images.map((image, imageIndex) => (
                  <FileUpload
                    key={`${venueIndex}-image-${imageIndex}`}
                    value={image}
                    onChange={(val) => handleImageChanged(venueIndex, imageIndex, val)}
                  />
                ))}
                {venue.images.length < 2 && (
                  <FileUpload
                    key={`${venueIndex}-image-new-${venue.images.length}`}
                    value={undefined}
                    onChange={(val) => {
                      if (val) handleImageAdded(venueIndex, val);
                    }}
                  />
                )}
              </div>
              <p className="text-xs text-muted-foreground">
                {venue.images.length}/2 images
              </p>
            </div>
          </CardContent>
        </Card>
      ))}

      {venues.length < 10 && (
        <Button variant="outline" onClick={addVenue} className="w-full">
          <Plus className="h-4 w-4 mr-2" />
          Add Another Venue
        </Button>
      )}
    </div>
  );
}
