import { uploadFileAction } from '@/app/actions/upload';

export type FileUploadValue = string | File | undefined | null;

/**
 * Uploads a pending File to blob storage, or returns the existing URL string.
 * Returns undefined if no value is provided.
 */
export async function uploadPendingFile(
  value: FileUploadValue,
  folder: string
): Promise<string | undefined> {
  if (!value) return undefined;
  if (typeof value === 'string') return value;

  const formData = new FormData();
  formData.append('file', value);
  formData.append('folder', folder);
  const result = await uploadFileAction(formData);
  if ('error' in result) throw new Error(result.error);
  return result.data.url;
}

/**
 * Uploads all pending Files in an array, returning an array of URL strings.
 * Existing URL strings are kept as-is.
 */
export async function uploadPendingFiles(
  values: (string | File)[],
  folder: string
): Promise<string[]> {
  return Promise.all(
    values.map(async (v) => {
      if (typeof v === 'string') return v;
      const url = await uploadPendingFile(v, folder);
      if (!url) throw new Error('Upload failed');
      return url;
    })
  );
}
