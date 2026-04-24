import { Router, Request, Response } from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { getDb } from "../db";
import { requireAuth, AuthRequest } from "../middleware/auth";
import { LoginDTO, ApiResponse } from "../types";

const router = Router();

// POST /api/auth/login
router.post("/login", (req: Request, res: Response): void => {
  const { username, password }: LoginDTO = req.body;

  if (!username || !password) {
    res
      .status(400)
      .json({ success: false, error: "Username and password required" });
    return;
  }

  const db = getDb();
  const user = db
    .prepare("SELECT * FROM admin_users WHERE username = ?")
    .get(username) as unknown as
    | {
        id: number;
        username: string;
        password: string;
      }
    | undefined;

  if (!user || !bcrypt.compareSync(password, user.password)) {
    res.status(401).json({ success: false, error: "Invalid credentials" });
    return;
  }

  const secret = process.env.JWT_SECRET || "dev-secret-change-in-production";
  const token = jwt.sign({ userId: user.id, username: user.username }, secret, {
    expiresIn: "24h",
  });

  const response: ApiResponse<{ token: string; username: string }> = {
    success: true,
    data: { token, username: user.username },
  };
  res.json(response);
});

// GET /api/auth/me - Verify token
router.get("/me", requireAuth, (req: AuthRequest, res: Response): void => {
  res.json({ success: true, data: { username: req.user?.username } });
});

export default router;
