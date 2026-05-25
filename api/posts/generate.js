import { requireAuth } from "../lib/auth.js";
import { getSettings, createPost } from "../lib/db.js";
import { generatePost } from "../lib/openai.js";

export default async function handler(req, res) {
  const user = requireAuth(req, res);
  if (!user) return;
  if (req.method !== "POST") return res.status(405).end();

  const { niche, subject, tone, pageId } = req.body;
  if (!niche || !subject) {
    return res.status(400).json({ error: "niche et subject sont requis" });
  }

  try {
    const content = await generatePost({ niche, subject, tone });
    const id = await createPost({
      userId: user.userId,
      pageId: pageId ?? null,
      niche,
      subject,
      content,
    });
    res.json({ id, content, status: "pending" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Erreur lors de la génération" });
  }
}
