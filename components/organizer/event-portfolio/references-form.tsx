'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Plus, Trash2 } from 'lucide-react';

export interface Reference {
  name: string;
  company: string;
  contact: string; // Email or phone
  type: 'client_testimonial' | 'partner' | 'industry';
}

interface ReferencesFormProps {
  initialData?: Reference[];
  onChange: (references: Reference[]) => void;
}

export function ReferencesForm({ initialData, onChange }: ReferencesFormProps) {
  const [references, setReferences] = useState<Reference[]>(
    initialData && initialData.length > 0
      ? initialData
      : []
  );

  const updateReference = (index: number, field: keyof Reference, value: string) => {
    const newReferences = [...references];
    newReferences[index] = { ...newReferences[index], [field]: value };
    setReferences(newReferences);
    onChange(newReferences);
  };

  const addReference = () => {
    if (references.length >= 4) return;
    const newReferences = [...references, { name: '', company: '', contact: '', type: 'industry' as const }];
    setReferences(newReferences);
    onChange(newReferences);
  };

  const removeReference = (index: number) => {
    const newReferences = references.filter((_, i) => i !== index);
    setReferences(newReferences);
    onChange(newReferences);
  };

  return (
    <div className="space-y-4">
      {references.map((reference, index) => (
        <Card key={index}>
          <CardContent className="pt-6 space-y-4">
            <div className="flex justify-between items-center">
              <h3 className="font-medium">Reference {index + 1}</h3>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => removeReference(index)}
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>

            <div className="space-y-2">
              <Label htmlFor={`ref-name-${index}`}>Name</Label>
              <Input
                id={`ref-name-${index}`}
                placeholder="Contact person name"
                value={reference.name}
                onChange={(e) => updateReference(index, 'name', e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor={`ref-company-${index}`}>Company / Organization</Label>
              <Input
                id={`ref-company-${index}`}
                placeholder="Company or organization name"
                value={reference.company}
                onChange={(e) => updateReference(index, 'company', e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor={`ref-contact-${index}`}>Contact (Email or Phone)</Label>
              <Input
                id={`ref-contact-${index}`}
                placeholder="email@example.com or +1 (555) 123-4567"
                value={reference.contact}
                onChange={(e) => updateReference(index, 'contact', e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor={`ref-type-${index}`}>Reference Type</Label>
              <Select
                value={reference.type}
                onValueChange={(value) => updateReference(index, 'type', value as Reference['type'])}
              >
                <SelectTrigger id={`ref-type-${index}`}>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="client_testimonial">Client Testimonial</SelectItem>
                  <SelectItem value="partner">Partner Recommendation</SelectItem>
                  <SelectItem value="industry">Industry Reference</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>
      ))}

      {references.length < 4 && (
        <Button variant="outline" onClick={addReference} className="w-full">
          <Plus className="h-4 w-4 mr-2" />
          Add Another Reference
        </Button>
      )}
    </div>
  );
}
