import { Request, Response, NextFunction } from "express";

const SUPABASE_URL = process.env.SUPABASE_URL ?? "";
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY ?? "";

/**
 * Verify the Supabase JWT from the Authorization header.
 * Uses Supabase's /auth/v1/user endpoint to validate — no local secret needed.
 * Attaches the verified userId to req.headers["x-verified-user-id"].
 */
export async function requireAuth(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith("Bearer ")) {
    res.status(401).json({ error: "Missing or invalid Authorization header" });
    return;
  }

  const token = authHeader.slice(7);

  try {
    const userRes = await fetch(`${SUPABASE_URL}/auth/v1/user`, {
      headers: {
        Authorization: `Bearer ${token}`,
        apikey: SERVICE_ROLE_KEY,
      },
    });

    if (!userRes.ok) {
      res.status(401).json({ error: "Invalid or expired token" });
      return;
    }

    const user = await userRes.json() as { id?: string };
    if (!user?.id) {
      res.status(401).json({ error: "Could not identify user" });
      return;
    }

    // Attach verified ID so routes can compare against body userId
    req.headers["x-verified-user-id"] = user.id;
    next();
  } catch {
    res.status(500).json({ error: "Auth verification failed" });
  }
}
