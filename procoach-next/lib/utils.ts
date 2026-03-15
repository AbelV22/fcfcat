/**
 * utils.ts — pure client-safe utilities (no Node.js imports)
 * Safe to import in both server and client components.
 */

/** Simple slug generator — replaces the one in data.ts for client-safe use */
export function slugify(text: string): string {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9\s-]/g, '')
    .trim()
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
}
