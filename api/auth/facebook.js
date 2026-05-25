export default function handler(req, res) {
  const params = new URLSearchParams({
    client_id: process.env.FB_APP_ID,
    redirect_uri: `${process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : process.env.NEXT_PUBLIC_APP_URL}/api/auth/callback`,
    scope: [
      "pages_manage_posts",
      "pages_read_engagement",
      "pages_manage_engagement",
      "pages_messaging",
      "public_profile",
      "email",
    ].join(","),
    response_type: "code",
    state: "socialmind",
  });
  res.redirect(`https://www.facebook.com/v19.0/dialog/oauth?${params}`);
}
