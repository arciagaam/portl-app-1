'use client';

import { useState, useRef, useCallback, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { ImageIcon, AlertCircle, X, Loader2 } from 'lucide-react';
import { deleteFileAction } from '@/app/actions/upload';
import { ALLOWED_IMAGE_TYPES, MAX_FILE_SIZE } from '@/lib/validations/upload';

interface FileUploadProps {
  value?: string | File;
  onChange: (value: string | File | undefined) => void;
  label?: string;
  description?: string;
  required?: boolean;
  disabled?: boolean;
  accept?: string;
}

export function FileUpload({
  value,
  onChange,
  label,
  description,
  required = false,
  disabled = false,
  accept = 'image/jpeg,image/png,image/webp,image/gif',
}: FileUploadProps) {
  const [isDeleting, setIsDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [objectUrl, setObjectUrl] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Create/revoke object URL for File values
  useEffect(() => {
    if (value instanceof File) {
      const url = URL.createObjectURL(value);
      setObjectUrl(url);
      return () => URL.revokeObjectURL(url);
    }
    setObjectUrl(null);
  }, [value]);

  const handleFileSelect = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;

      setError(null);

      if (
        !ALLOWED_IMAGE_TYPES.includes(
          file.type as (typeof ALLOWED_IMAGE_TYPES)[number]
        )
      ) {
        setError(
          'Invalid file type. Please upload a JPEG, PNG, WebP, or GIF image.'
        );
        return;
      }

      if (file.size > MAX_FILE_SIZE) {
        setError(
          `File too large. Maximum size is ${MAX_FILE_SIZE / (1024 * 1024)}MB.`
        );
        return;
      }

      onChange(file);

      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    },
    [onChange]
  );

  const handleRemove = useCallback(async () => {
    if (!value) return;
    setError(null);

    if (typeof value === 'string') {
      // Existing uploaded URL — delete from blob storage
      setIsDeleting(true);
      try {
        await deleteFileAction(value);
        onChange(undefined);
      } catch {
        setError('Failed to remove file.');
      } finally {
        setIsDeleting(false);
      }
    } else {
      // Pending File — just clear it, nothing to delete
      onChange(undefined);
    }
  }, [value, onChange]);

  const displayUrl = objectUrl || (typeof value === 'string' ? value : null);

  return (
    <div className="space-y-2">
      {label && (
        <Label>
          {label} {required && <span className="text-red-500">*</span>}
        </Label>
      )}
      {description && (
        <p className="text-sm text-muted-foreground">{description}</p>
      )}

      {displayUrl ? (
        <div className="group relative">
          <div className="overflow-hidden rounded-lg border bg-gray-50">
            <img
              src={displayUrl}
              alt={label || 'Uploaded file'}
              className="h-48 w-full object-contain"
            />
          </div>
          {isDeleting && (
            <div className="absolute inset-0 flex items-center justify-center rounded-lg bg-black/50">
              <div className="flex items-center gap-2 text-white">
                <Loader2 className="h-5 w-5 animate-spin" />
                <span className="text-sm">Removing...</span>
              </div>
            </div>
          )}
          {!disabled && !isDeleting && (
            <div className="absolute top-2 right-2 flex gap-1 opacity-0 transition-opacity group-hover:opacity-100">
              <Button
                type="button"
                variant="secondary"
                size="sm"
                onClick={() => fileInputRef.current?.click()}
              >
                Replace
              </Button>
              <Button
                type="button"
                variant="destructive"
                size="sm"
                onClick={handleRemove}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          )}
        </div>
      ) : (
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          disabled={disabled || isDeleting}
          className="w-full rounded-lg border-2 border-dashed border-gray-300 p-6 text-center transition-colors hover:border-gray-400 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50"
        >
          <div className="flex flex-col items-center gap-2">
            <ImageIcon className="h-8 w-8 text-gray-400" />
            <span className="text-sm font-medium text-gray-600">
              Click to upload
            </span>
            <span className="text-xs text-gray-400">
              JPEG, PNG, WebP, or GIF (max 4MB)
            </span>
          </div>
        </button>
      )}

      {error && (
        <div className="flex items-center gap-2 text-sm text-red-600">
          <AlertCircle className="h-4 w-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      <input
        ref={fileInputRef}
        type="file"
        accept={accept}
        onChange={handleFileSelect}
        className="hidden"
        disabled={disabled || isDeleting}
      />
    </div>
  );
}
