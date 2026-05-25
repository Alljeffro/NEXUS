import { requireAuth } from "../lib/auth.js";
import { getSettings, upsertSettings } from "../lib/db.js";

export default async function handler(req, res) {
  const user = requireAuth(req, res);
  if (!user) return;

  if (req.method === "GET") {
    const settings = await getSettings(user.userId);
    return res.json(settings ?? {});
  }

  if (req.method === "PUT") {
    const { niche, tone, moderationRules, selectedPageId, autoPublish } = req.body;
    await upsertSettings(user.userId, {
      niche: niche ?? "",
      tone: tone ?? "Professionnel et engageant",
      moderationRules: moderationRules ?? "",
      selectedPageId: selectedPageId ?? "",
      autoPublish: !!autoPublish,
    });
    return res.json({ success: true });
  }

  res.status(405).end();
}
