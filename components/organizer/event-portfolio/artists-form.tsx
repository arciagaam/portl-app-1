'use client';

import { useState } from 'react';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

export interface ArtistsTalent {
  notableArtists?: string;
  recurringTalent?: string;
}

interface ArtistsFormProps {
  initialData?: ArtistsTalent;
  onChange: (data: ArtistsTalent) => void;
}

export function ArtistsForm({ initialData, onChange }: ArtistsFormProps) {
  const [data, setData] = useState<ArtistsTalent>(
    initialData || { notableArtists: '', recurringTalent: '' }
  );

  const updateField = (field: keyof ArtistsTalent, value: string) => {
    const newData = { ...data, [field]: value };
    setData(newData);
    onChange(newData);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Artists & Talent</CardTitle>
        <CardDescription>
          List notable artists you&apos;ve worked with and any recurring talent relationships
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="notable-artists">Notable Artists You&apos;ve Worked With</Label>
          <Textarea
            id="notable-artists"
            placeholder="List notable artists, performers, or talent you've collaborated with..."
            value={data.notableArtists || ''}
            onChange={(e) => updateField('notableArtists', e.target.value)}
            rows={4}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="recurring-talent">Recurring Talent Relationships</Label>
          <Textarea
            id="recurring-talent"
            placeholder="Describe any ongoing or recurring relationships with artists, performers, or talent..."
            value={data.recurringTalent || ''}
            onChange={(e) => updateField('recurringTalent', e.target.value)}
            rows={4}
          />
        </div>
      </CardContent>
    </Card>
  );
}
