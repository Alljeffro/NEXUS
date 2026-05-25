import { requireAuth } from "../lib/auth.js";
import { getPost, updatePost, deletePost } from "../lib/db.js";
import { getPageToken, publishPost } from "../lib/facebook.js";
import { sql } from "@vercel/postgres";

export default async function handler(req, res) {
  const user = requireAuth(req, res);
  if (!user) return;

  const { id } = req.query;

  // ── PATCH /api/posts/:id  (edit content) ─────────────────────────────
  if (req.method === "PATCH") {
    const { content } = req.body;
    await updatePost(id, { content });
    return res.json({ success: true });
  }

  // ── DELETE /api/posts/:id ─────────────────────────────────────────────
  if (req.method === "DELETE") {
    await deletePost(id);
    return res.json({ success: true });
  }

  // ── POST /api/posts/:id/publish is handled in publish.js ─────────────
  res.status(405).end();
}
