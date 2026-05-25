import { requireAuth } from "../lib/auth.js";
import { getPostsByUser } from "../lib/db.js";

export default async function handler(req, res) {
  const user = requireAuth(req, res);
  if (!user) return;

  if (req.method !== "GET") return res.status(405).end();

  const posts = await getPostsByUser(user.userId);
  res.json(posts);
}
