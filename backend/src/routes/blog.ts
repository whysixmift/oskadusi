import { Router, Request, Response } from "express";
import { getDb } from "../db";
import { isAuthorizedTelegramRequester } from "../utils/telegram";
import { writeSystemLog } from "../utils/logging";
import { calculateReadTime, generateUniqueSlug } from "../utils/posts";
import { BlogPost } from "../types";

const router = Router();

interface TelegramBlogRequest {
  title?: string;
  content?: string;
  author?: string;
  timestamp?: string;
  publish?: boolean;
  category?: string;
}

// POST /api/blog - Create a blog post from the Telegram bot.
router.post("/", (req: Request, res: Response): void => {
  if (!isAuthorizedTelegramRequester(req)) {
    writeSystemLog("warn", "telegram", "Unauthorized blog post request", {
      ip: req.ip,
    });
    res.status(401).json({ success: false, error: "Unauthorized" });
    return;
  }

  const body = req.body as TelegramBlogRequest;
  const title = body.title?.trim();
  const content = body.content?.trim();

  if (!title || !content) {
    res
      .status(400)
      .json({ success: false, error: "Title and content are required" });
    return;
  }

  const db = getDb();
  const author = body.author?.trim() || "Telegram Bot";
  const timestamp = body.timestamp || new Date().toISOString();
  const publish = body.publish !== false;
  const slug = generateUniqueSlug(title);
  const readTime = calculateReadTime(content);

  const insertBlog = db.prepare(
    `INSERT INTO blog_posts (title, content, author, timestamp)
     VALUES (?, ?, ?, ?)`,
  );
  const insertPost = db.prepare(
    `INSERT INTO posts (slug, title, excerpt, content, category, author, published, published_at, read_time)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
  );

  const excerpt =
    content.length > 180 ? `${content.slice(0, 177).trim()}...` : content;

  const transaction = db.transaction(() => {
    const blogResult = insertBlog.run(title, content, author, timestamp);
    const postResult = insertPost.run(
      slug,
      title,
      excerpt,
      content,
      body.category || "Telegram",
      author,
      publish ? 1 : 0,
      publish ? timestamp : null,
      readTime,
    );

    writeSystemLog("info", "telegram", "Blog post created", {
      blogPostId: blogResult.lastInsertRowid,
      postId: postResult.lastInsertRowid,
      title,
      publish,
    });

    return { blogPostId: blogResult.lastInsertRowid, postId: postResult.lastInsertRowid };
  });

  const result = transaction();
  const post = db
    .prepare("SELECT * FROM posts WHERE id = ?")
    .get(result.postId) as BlogPost;

  res.status(201).json({
    success: true,
    data: {
      blogPostId: result.blogPostId,
      post,
    },
  });
});

export default router;
