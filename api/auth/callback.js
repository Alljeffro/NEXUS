import axios from "axios";
import { signToken } from "../lib/auth.js";
import { upsertUser } from "../lib/db.js";

const APP_URL = process.env.VERCEL_URL
  ? `https://${process.env.VERCEL_URL}`
  : process.env.NEXT_PUBLIC_APP_URL;

export default async function handler(req, res) {
  const { code, error } = req.query;

  if (error || !code) {
    return res.redirect(`${APP_URL}/auth/error`);
  }

  try {
    // 1. Exchange code → short-lived token
    const tokenRes = await axios.get("https://graph.facebook.com/v19.0/oauth/access_token", {
      params: {
        client_id: process.env.FB_APP_ID,
        client_secret: process.env.FB_APP_SECRET,
        redirect_uri: `${APP_URL}/api/auth/callback`,
        code,
      },
    });
    const shortToken = tokenRes.data.access_token;

    // 2. Exchange for long-lived token (60 days)
    const longRes = await axios.get("https://graph.facebook.com/v19.0/oauth/access_token", {
      params: {
        grant_type: "fb_exchange_token",
        client_id: process.env.FB_APP_ID,
        client_secret: process.env.FB_APP_SECRET,
        fb_exchange_token: shortToken,
      },
    });
    const longToken = longRes.data.access_token;

    // 3. Get user profile
    const meRes = await axios.get("https://graph.facebook.com/v19.0/me", {
      params: { access_token: longToken, fields: "id,name,email,picture.type(large)" },
    });
    const me = meRes.data;

    // 4. Get managed pages
    const pagesRes = await axios.get(`https://graph.facebook.com/v19.0/${me.id}/accounts`, {
      params: { access_token: longToken },
    });
    const pages = pagesRes.data.data ?? [];

    // 5. Persist user in DB
    await upsertUser({
      id: me.id,
      name: me.name,
      email: me.email ?? null,
      picture: me.picture?.data?.url ?? null,
      fbToken: longToken,
      pages,
    });

    // 6. Create our app JWT (does NOT contain the FB token — keep it server-side)
    const appToken = signToken({
      userId: me.id,
      name: me.name,
      email: me.email ?? null,
      picture: me.picture?.data?.url ?? null,
      pages,
    });

    res.redirect(`${APP_URL}/auth/callback?token=${appToken}`);
  } catch (err) {
    console.error("OAuth callback error:", err.response?.data ?? err.message);
    res.redirect(`${APP_URL}/auth/error`);
  }
}
