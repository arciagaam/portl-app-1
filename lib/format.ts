/**
 * Format a PHP amount (stored as whole PHP integers) for display.
 * Example: formatPhp(1500) => "PHP 1,500.00"
 */
export function formatPhp(amountInPhp: number): string {
  if (amountInPhp === 0) return 'FREE';
  return new Intl.NumberFormat('en-PH', {
    style: 'currency',
    currency: 'PHP',
  }).format(amountInPhp);
}
