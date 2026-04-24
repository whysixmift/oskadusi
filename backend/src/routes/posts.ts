import { Router, Request, Response } from "express";
import { getDb } from "../db";
import { requireAuth, AuthRequest } from "../middleware/auth";
import {
  BlogPost,
  CreatePostDTO,
  UpdatePostDTO,
  ApiResponse,
  PaginatedResponse,
} from "../types";

const router = Router();

// Helper: calculate read time from content
function calculateReadTime(content: string): number {
  const wordsPerMinute = 200;
  const wordCount = content.trim().split(/\s+/).length;
  return Math.max(1, Math.ceil(wordCount / wordsPerMinute));
}

// Helper: generate slug from title
function generateSlug(title: string): string {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .trim();
}

// GET /api/posts — List published posts (public)
router.get("/", (req: Request, res: Response): void => {
  const db = getDb();
  const page = Math.max(1, parseInt(req.query.page as string) || 1);
  const limit = Math.min(
    50,
    Math.max(1, parseInt(req.query.limit as string) || 10),
  );
  const category = req.query.category as string | undefined;
  const offset = (page - 1) * limit;

  let whereClause = "WHERE published = 1";
  const params: (string | number)[] = [];

  if (category) {
    whereClause += " AND category = ?";
    params.push(category);
  }

  const total = (
    db
      .prepare(`SELECT COUNT(*) as c FROM posts ${whereClause}`)
      .get(...params) as { c: number }
  ).c;

  const posts = db
    .prepare(
      `SELECT id, slug, title, excerpt, image, category, author, published_at, read_time, created_at
       FROM posts ${whereClause}
       ORDER BY published_at DESC, created_at DESC
       LIMIT ? OFFSET ?`,
    )
    .all(...params, limit, offset) as unknown as Omit<BlogPost, "content">[];

  const response: ApiResponse<PaginatedResponse<Omit<BlogPost, "content">>> = {
    success: true,
    data: {
      data: posts,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    },
  };
  res.json(response);
});

// GET /api/posts/all — List ALL posts including drafts (admin only)
router.get("/all", requireAuth, (_req: AuthRequest, res: Response): void => {
  const db = getDb();
  const posts = db
    .prepare(
      `SELECT id, slug, title, excerpt, image, category, author, published, published_at, read_time, created_at, updated_at
       FROM posts
       ORDER BY created_at DESC`,
    )
    .all() as unknown as Omit<BlogPost, "content">[];

  res.json({ success: true, data: posts });
});

// GET /api/posts/:slug — Get single post by slug (public)
router.get("/:slug", (req: Request, res: Response): void => {
  const db = getDb();
  const post = db
    .prepare("SELECT * FROM posts WHERE slug = ? AND published = 1")
    .get(req.params.slug) as BlogPost | undefined;

  if (!post) {
    res.status(404).json({ success: false, error: "Post not found" });
    return;
  }

  res.json({ success: true, data: post });
});

// POST /api/posts — Create post (admin only)
router.post("/", requireAuth, (req: AuthRequest, res: Response): void => {
  const db = getDb();
  const body: CreatePostDTO = req.body;

  if (!body.title || !body.content) {
    res
      .status(400)
      .json({ success: false, error: "Title and content are required" });
    return;
  }

  const slug = body.slug || generateSlug(body.title);
  const readTime = calculateReadTime(body.content);
  const now = new Date().toISOString();

  try {
    const result = db
      .prepare(
        `INSERT INTO posts (slug, title, excerpt, content, image, category, author, published, published_at, read_time)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      )
      .run(
        slug,
        body.title,
        body.excerpt || "",
        body.content,
        body.image || "",
        body.category || "Umum",
        body.author || "OSKADUSI",
        body.published ? 1 : 0,
        body.published ? now : null,
        readTime,
      );

    const post = db
      .prepare("SELECT * FROM posts WHERE id = ?")
      .get(result.lastInsertRowid) as unknown as BlogPost;

    res.status(201).json({ success: true, data: post });
  } catch (err: unknown) {
    if (err instanceof Error && err.message.includes("UNIQUE constraint")) {
      res
        .status(409)
        .json({
          success: false,
          error: "A post with this slug already exists",
        });
    } else {
      throw err;
    }
  }
});

// PUT /api/posts/:id — Update post (admin only)
router.put("/:id", requireAuth, (req: AuthRequest, res: Response): void => {
  const db = getDb();
  const id = parseInt(req.params.id);
  const body: UpdatePostDTO = req.body;

  const existing = db.prepare("SELECT * FROM posts WHERE id = ?").get(id) as
    | BlogPost
    | undefined;
  if (!existing) {
    res.status(404).json({ success: false, error: "Post not found" });
    return;
  }

  const readTime = body.content
    ? calculateReadTime(body.content)
    : existing.read_time;
  const now = new Date().toISOString();

  // If publishing for the first time, set published_at
  const publishedAt =
    body.published && !existing.published ? now : existing.published_at;

  db.prepare(
    `UPDATE posts SET
      slug        = COALESCE(?, slug),
      title       = COALESCE(?, title),
      excerpt     = COALESCE(?, excerpt),
      content     = COALESCE(?, content),
      image       = COALESCE(?, image),
      category    = COALESCE(?, category),
      author      = COALESCE(?, author),
      published   = COALESCE(?, published),
      published_at = ?,
      read_time   = ?
    WHERE id = ?`,
  ).run(
    body.slug ?? null,
    body.title ?? null,
    body.excerpt ?? null,
    body.content ?? null,
    body.image ?? null,
    body.category ?? null,
    body.author ?? null,
    body.published !== undefined ? (body.published ? 1 : 0) : null,
    publishedAt,
    readTime,
    id,
  );

  const updated = db
    .prepare("SELECT * FROM posts WHERE id = ?")
    .get(id) as unknown as BlogPost;
  res.json({ success: true, data: updated });
});

// DELETE /api/posts/:id — Delete post (admin only)
router.delete("/:id", requireAuth, (req: AuthRequest, res: Response): void => {
  const db = getDb();
  const id = parseInt(req.params.id);

  const existing = db.prepare("SELECT id FROM posts WHERE id = ?").get(id);
  if (!existing) {
    res.status(404).json({ success: false, error: "Post not found" });
    return;
  }

  db.prepare("DELETE FROM posts WHERE id = ?").run(id);
  res.json({ success: true, message: "Post deleted successfully" });
});

export default router;
