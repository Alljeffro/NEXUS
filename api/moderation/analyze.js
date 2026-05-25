import { requireAuth } from "../lib/auth.js";
import { getSettings, createModerationLog } from "../lib/db.js";
import { moderateComment } from "../lib/openai.js";
import { replyToComment, deleteComment } from "../lib/facebook.js";
import { sql } from "@vercel/postgres";

/**
 * Core moderation engine — used by the REST endpoint AND the cron job.
 * pageToken must be obtained by the caller.
 */
export async function runModeration({ userId, message, commentId, senderId, pageId, pageToken }) {
  const settings = await getSettings(userId);
  const rules = settings?.moderation_rules ?? "";

  const result = await moderateComment({ message, moderationRules: rules });

  if (result.action === "block") {
    await deleteComment(commentId, pageToken).catch(() => {});
    const log = await createModerationLog({
      userId, pageId, commentId, senderId,
      userMessage: message,
      aiDecision: "BLOQUÉ",
      aiResponse: null,
    });
    return { action: "blocked", log };
  } else {
    await replyToComment(commentId, pageToken, result.response).catch(() => {});
    const log = await createModerationLog({
      userId, pageId, commentId, senderId,
      userMessage: message,
      aiDecision: "RÉPONDU",
      aiResponse: result.response,
    });
    return { action: "replied", response: result.response, log };
  }
}

// ── REST endpoint for manual test from the dashboard ─────────────────────
export default async function handler(req, res) {
  const user = requireAuth(req, res);
  if (!user) return;
  if (req.method !== "POST") return res.status(405).end();

  const { message, commentId = "manual-test", senderId = "test", pageId } = req.body;
  if (!message) return res.status(400).json({ error: "message requis" });

  // For manual test we don't hit Facebook — just run AI analysis
  const settings = await getSettings(user.userId);
  const result = await moderateComment({
    message,
    moderationRules: settings?.moderation_rules ?? "",
  });

  // Log it
  const log = await createModerationLog({
    userId: user.userId,
    pageId: pageId ?? "test",
    commentId,
    senderId,
    userMessage: message,
    aiDecision: result.action === "block" ? "BLOQUÉ" : "RÉPONDU",
    aiResponse: result.response ?? null,
  });

  res.json({ action: result.action === "block" ? "blocked" : "replied", response: result.response ?? null, log });
}
