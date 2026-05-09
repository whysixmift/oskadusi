import { getDb } from "../db";

export function calculateReadTime(content: string): number {
  const wordsPerMinute = 200;
  const wordCount = content.trim().split(/\s+/).filter(Boolean).length;
  return Math.max(1, Math.ceil(wordCount / wordsPerMinute));
}

export function generateSlug(title: string): string {
  const slug = title
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");

  return slug || "post";
}

export function generateUniqueSlug(title: string): string {
  const db = getDb();
  const baseSlug = generateSlug(title);
  let slug = baseSlug;
  let suffix = 2;

  while (db.prepare("SELECT id FROM posts WHERE slug = ?").get(slug)) {
    slug = `${baseSlug}-${suffix}`;
    suffix += 1;
  }

  return slug;
}
