import { Request, Response, NextFunction } from "express";

/**
 * Require X-Admin-Secret header to match ADMIN_SECRET env var.
 * Apply to any route that should be restricted to the server operator.
 */
export function adminAuth(req: Request, res: Response, next: NextFunction): void {
  const secret = process.env.ADMIN_SECRET;
  if (!secret) {
    // If no secret is configured, deny all access to be safe
    res.status(503).json({ error: "Admin access not configured" });
    return;
  }
  const provided = req.headers["x-admin-secret"];
  if (!provided || provided !== secret) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }
  next();
}
