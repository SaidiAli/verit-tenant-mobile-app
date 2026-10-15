export function identityValues(tin: string, nin: string) {
  const normalizedTin = tin.trim();
  const normalizedNin = nin.trim().toUpperCase();
  if (normalizedTin && !/^\d{10}$/.test(normalizedTin)) throw new Error('TIN must contain 10 digits');
  if (normalizedNin && !/^[A-Z0-9]{14}$/.test(normalizedNin)) throw new Error('NIN must contain 14 letters or digits');
  return { tin: normalizedTin || null, nin: normalizedNin || null };
}
export function validateIdentityImage(file: { mimeType?: string | null; fileSize?: number }): void {
  if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.mimeType ?? '')) throw new Error('Choose a JPEG, PNG, or WebP image');
  if (file.fileSize !== undefined && (file.fileSize <= 0 || file.fileSize > 15 * 1024 * 1024)) throw new Error('ID picture must be between 1 byte and 15 MiB');
}
