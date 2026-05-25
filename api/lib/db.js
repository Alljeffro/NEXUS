import { sql } from "@vercel/postgres";

// ── Auto-migrate on first cold start ──────────────────────────────────────
let migrated = false;
export async function ensureSchema() {
  if (migrated) return;
  await sql`
    CREATE TABLE IF NOT EXISTS users (
      id          TEXT PRIMARY KEY,
      name        TEXT,
      email       TEXT,
      picture     TEXT,
      fb_token    TEXT,
      pages       JSONB DEFAULT '[]',
      created_at  TIMESTAMPTZ DEFAULT NOW()
    );
  `;
  await sql`
    CREATE TABLE IF NOT EXISTS settings (
      user_id          TEXT PRIMARY KEY REFERENCES users(id),
      niche            TEXT DEFAULT '',
      tone             TEXT DEFAULT 'Professionnel et engageant',
      moderation_rules TEXT DEFAULT '',
      selected_page_id TEXT DEFAULT '',
      auto_publish     BOOLEAN DEFAULT FALSE,
      updated_at       TIMESTAMPTZ DEFAULT NOW()
    );
  `;
  await sql`
    CREATE TABLE IF NOT EXISTS posts (
      id           TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
      user_id      TEXT REFERENCES users(id),
      page_id      TEXT,
      niche        TEXT,
      subject      TEXT,
      content      TEXT,
      status       TEXT DEFAULT 'pending',
      fb_post_id   TEXT,
      published_at TIMESTAMPTZ,
      created_at   TIMESTAMPTZ DEFAULT NOW()
    );
  `;
  await sql`
    CREATE TABLE IF NOT EXISTS moderation_logs (
      id           TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
      user_id      TEXT REFERENCES users(id),
      page_id      TEXT,
      comment_id   TEXT,
      sender_id    TEXT,
      user_message TEXT,
      ai_decision  TEXT,
      ai_response  TEXT,
      created_at   TIMESTAMPTZ DEFAULT NOW()
    );
  `;
  migrated = true;
}

// ── Users ──────────────────────────────────────────────────────────────────
export async function upsertUser({ id, name, email, picture, fbToken, pages }) {
  await ensureSchema();
  await sql`
    INSERT INTO users (id, name, email, picture, fb_token, pages)
    VALUES (${id}, ${name}, ${email ?? null}, ${picture ?? null}, ${fbToken}, ${JSON.stringify(pages)})
    ON CONFLICT (id) DO UPDATE
      SET name = EXCLUDED.name,
          picture = EXCLUDED.picture,
          fb_token = EXCLUDED.fb_token,
          pages = EXCLUDED.pages;
  `;
}

// ── Settings ───────────────────────────────────────────────────────────────
export async function getSettings(userId) {
  await ensureSchema();
  const { rows } = await sql`SELECT * FROM settings WHERE user_id = ${userId}`;
  return rows[0] ?? null;
}

export async function upsertSettings(userId, { niche, tone, moderationRules, selectedPageId, autoPublish }) {
  await ensureSchema();
  await sql`
    INSERT INTO settings (user_id, niche, tone, moderation_rules, selected_page_id, auto_publish, updated_at)
    VALUES (${userId}, ${niche}, ${tone}, ${moderationRules}, ${selectedPageId}, ${autoPublish}, NOW())
    ON CONFLICT (user_id) DO UPDATE
      SET niche = EXCLUDED.niche,
          tone = EXCLUDED.tone,
          moderation_rules = EXCLUDED.moderation_rules,
          selected_page_id = EXCLUDED.selected_page_id,
          auto_publish = EXCLUDED.auto_publish,
          updated_at = NOW();
  `;
}

// ── Posts ──────────────────────────────────────────────────────────────────
export async function createPost({ userId, pageId, niche, subject, content }) {
  await ensureSchema();
  const { rows } = await sql`
    INSERT INTO posts (user_id, page_id, niche, subject, content, status)
    VALUES (${userId}, ${pageId ?? null}, ${niche ?? null}, ${subject ?? null}, ${content}, 'pending')
    RETURNING id;
  `;
  return rows[0].id;
}

export async function getPost(id) {
  await ensureSchema();
  const { rows } = await sql`SELECT * FROM posts WHERE id = ${id}`;
  return rows[0] ?? null;
}

export async function getPostsByUser(userId) {
  await ensureSchema();
  const { rows } = await sql`
    SELECT * FROM posts WHERE user_id = ${userId} ORDER BY created_at DESC LIMIT 100
  `;
  return rows;
}

export async function updatePost(id, { content, status, fbPostId, publishedAt }) {
  await ensureSchema();
  await sql`
    UPDATE posts SET
      content      = COALESCE(${content ?? null}, content),
      status       = COALESCE(${status ?? null}, status),
      fb_post_id   = COALESCE(${fbPostId ?? null}, fb_post_id),
      published_at = COALESCE(${publishedAt ?? null}, published_at)
    WHERE id = ${id};
  `;
}

export async function deletePost(id) {
  await ensureSchema();
  await sql`DELETE FROM posts WHERE id = ${id}`;
}

// ── Moderation logs ────────────────────────────────────────────────────────
export async function createModerationLog({ userId, pageId, commentId, senderId, userMessage, aiDecision, aiResponse }) {
  await ensureSchema();
  const { rows } = await sql`
    INSERT INTO moderation_logs (user_id, page_id, comment_id, sender_id, user_message, ai_decision, ai_response)
    VALUES (${userId}, ${pageId ?? null}, ${commentId ?? null}, ${senderId ?? null}, ${userMessage}, ${aiDecision}, ${aiResponse ?? null})
    RETURNING *;
  `;
  return rows[0];
}

export async function getModerationLogs(userId, limit = 200) {
  await ensureSchema();
  const { rows } = await sql`
    SELECT * FROM moderation_logs WHERE user_id = ${userId} ORDER BY created_at DESC LIMIT ${limit}
  `;
  return rows;
}

// ── Get user with fb_token (for cron jobs) ────────────────────────────────
export async function getAllUsersWithSettings() {
  await ensureSchema();
  const { rows } = await sql`
    SELECT u.id, u.fb_token, u.pages, s.*
    FROM users u
    LEFT JOIN settings s ON s.user_id = u.id
    WHERE s.selected_page_id IS NOT NULL AND s.selected_page_id != ''
  `;
  return rows;
}
