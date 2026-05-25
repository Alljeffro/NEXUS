import { getUserFromRequest } from "../lib/auth.js";

export default function handler(req, res) {
  const user = getUserFromRequest(req);
  if (!user) return res.status(401).json({ error: "Non authentifié" });
  res.json({ user });
}
