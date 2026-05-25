import jwt from "jsonwebtoken";

const SECRET = process.env.JWT_SECRET;

export function signToken(payload) {
  return jwt.sign(payload, SECRET, { expiresIn: "60d" });
}

export function verifyToken(token) {
  return jwt.verify(token, SECRET);
}

/**
 * Extract and verify the Bearer token from a Vercel request.
 * Returns the decoded payload or null.
 */
export function getUserFromRequest(req) {
  try {
    const auth = req.headers["authorization"] ?? "";
    const token = auth.replace(/^Bearer\s+/i, "");
    if (!token) return null;
    return verifyToken(token);
  } catch {
    return null;
  }
}

/** Middleware-style helper for serverless route handlers */
export function requireAuth(req, res) {
  const user = getUserFromRequest(req);
  if (!user) {
    res.status(401).json({ error: "Non authentifié" });
    return null;
  }
  return user;
}
