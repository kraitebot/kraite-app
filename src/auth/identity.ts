const FALLBACK_INITIALS = 'TR';

/**
 * The trader's avatar initials: the first letter of each of the first two words
 * of their name, falling back to "TR" when there is no usable name.
 *
 * Empty segments are filtered out rather than sliced blindly, so a name carrying
 * a leading or doubled space still yields both initials instead of silently
 * dropping one.
 */
export function traderInitials(name: string | null | undefined): string {
  const words = (name ?? '').trim().split(/\s+/).filter(Boolean);

  return words
    .slice(0, 2)
    .map((word) => word[0] ?? '')
    .join('')
    .toUpperCase() || FALLBACK_INITIALS;
}
