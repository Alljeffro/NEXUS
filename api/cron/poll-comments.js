/**
 * Vercel Cron Job — runs every 5 minutes (see vercel.json)
 * Replaces Make.com "Watch Comments" + moderation scenarios.
 *
 * For each user with an active page:
 *   1. Fetches recent posts on the page
 *   2. Fetches new comments on those posts (since last poll)
 *   3. Runs AI moderation on each unseen comment
 *   4. Blocks or replies via Facebook Graph API
 *
 * "Last seen" timestamp is stored per user in the DB to avoid double-processing.
 */
import { getAllUsersWithSettings, createModerationLog } from "../lib/db.js";
import { moderateComment } from "../lib/openai.js";
import { getPageToken, getRecentPagePosts, getRecentComments, replyToComment, deleteComment } from "../lib/facebook.js";
import { sql } from "@vercel/postgres";

async function getLastPolled(userId) {
  await sql`
    CREATE TABLE IF NOT EXISTS poll_state (
      user_id    TEXT PRIMARY KEY,
      last_polled TIMESTAMPTZ DEFAULT NOW()
    )
  `;
  const { rows } = await sql`SELECT last_polled FROM poll_state WHERE user_id = ${userId}`;
  // Default: 6 minutes ago (one cron interval + buffer)
  return rows[0]?.last_polled ?? new Date(Date.now() - 6 * 60 * 1000).toISOString();
}

async function setLastPolled(userId) {
  await sql`
    INSERT INTO poll_state (user_id, last_polled)
    VALUES (${userId}, NOW())
    ON CONFLICT (user_id) DO UPDATE SET last_polled = NOW()
  `;
}

export default async function handler(req, res) {
  if (req.headers.authorization !== `Bearer ${process.env.CRON_SECRET}`) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  const users = await getAllUsersWithSettings();
  let totalProcessed = 0;

  for (const u of users) {
    if (!u.selected_page_id) continue;

    try {
      const { rows } = await sql`SELECT fb_token FROM users WHERE id = ${u.id}`;
      const fbToken = rows[0]?.fb_token;
      if (!fbToken) continue;

      const pageToken = await getPageToken(u.selected_page_id, fbToken);
      if (!pageToken) continue;

      const since = await getLastPolled(u.id);
      const sinceUnix = Math.floor(new Date(since).getTime() / 1000);

      // Fetch last 10 posts on the page
      const posts = await getRecentPagePosts(u.selected_page_id, pageToken, 10);

      for (const post of posts) {
        const comments = await getRecentComments(post.id, pageToken, sinceUnix);

        for (const comment of comments) {
          // Skip empty or bot-generated comments
          if (!comment.message?.trim()) continue;

          const result = await moderateComment({
            message: comment.message,
            moderationRules: u.moderation_rules ?? "",
          });

          if (result.action === "block") {
            await deleteComment(comment.id, pageToken).catch(() => {});
            await createModerationLog({
              userId: u.id,
              pageId: u.selected_page_id,
              commentId: comment.id,
              senderId: comment.from?.id ?? "unknown",
              userMessage: comment.message,
              aiDecision: "BLOQUÉ",
              aiResponse: null,
            });
          } else {
            await replyToComment(comment.id, pageToken, result.response).catch(() => {});
            await createModerationLog({
              userId: u.id,
              pageId: u.selected_page_id,
              commentId: comment.id,
              senderId: comment.from?.id ?? "unknown",
              userMessage: comment.message,
              aiDecision: "RÉPONDU",
              aiResponse: result.response,
            });
          }

          totalProcessed++;
          // Rate-limit: avoid hammering OpenAI
          await new Promise((r) => setTimeout(r, 300));
        }
      }

      await setLastPolled(u.id);
    } catch (err) {
      console.error(`poll-comments failed for user ${u.id}:`, err.message);
    }
  }

  console.log(`Cron poll-comments done. Processed ${totalProcessed} comments.`);
  res.json({ ok: true, totalProcessed });
}
