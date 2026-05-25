import { requireAuth } from "../lib/auth.js";
import { getPost, updatePost } from "../lib/db.js";
import { getPageToken, publishPost } from "../lib/facebook.js";
import { sql } from "@vercel/postgres";

export default async function handler(req, res) {
  const user = requireAuth(req, res);
  if (!user) return;
  if (req.method !== "POST") return res.status(405).end();

  const { postId, editedContent } = req.body;
  if (!postId) return res.status(400).json({ error: "postId requis" });

  const post = await getPost(postId);
  if (!post) return res.status(404).json({ error: "Post introuvable" });
  if (post.user_id !== user.userId) return res.status(403).json({ error: "Interdit" });

  const content = editedContent || post.content;

  // Get the page access token from DB (fb_token stored on user)
  const { rows } = await sql`SELECT fb_token FROM users WHERE id = ${user.userId}`;
  const fbToken = rows[0]?.fb_token;
  if (!fbToken) return res.status(400).json({ error: "Token Facebook manquant. Reconnectez-vous." });

  const pageToken = await getPageToken(post.page_id, fbToken);
  if (!pageToken) return res.status(400).json({ error: "Page Facebook introuvable ou accès refusé" });

  try {
    const fbPostId = await publishPost(post.page_id, pageToken, content);
    await updatePost(postId, {
      content,
      status: "published",
      fbPostId,
      publishedAt: new Date().toISOString(),
    });
    res.json({ success: true, fbPostId });
  } catch (err) {
    console.error("Facebook publish error:", err.response?.data ?? err.message);
    res.status(500).json({ error: "Erreur lors de la publication Facebook" });
  }
}
