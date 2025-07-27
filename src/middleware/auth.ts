import { Request, Response, NextFunction } from "express";

interface AuthRequest extends Request {
  isValidOrigin?: boolean;
}

export const apiKeyAuth = (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  const apiKey = req.headers["x-api-key"] as string;
  const origin = req.headers.origin || req.headers.referer;

  // Check API key
  if (!apiKey || apiKey !== process.env.API_KEY) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  // Validate origin for production
  if (process.env.NODE_ENV === "production") {
    const allowedOrigins = process.env.CORS_ORIGINS?.split(",") || [];
    const isValidOrigin = allowedOrigins.some((allowedOrigin) =>
      origin?.startsWith(allowedOrigin.trim())
    );

    if (!isValidOrigin) {
      return res.status(403).json({ error: "Forbidden" });
    }
  }

  req.isValidOrigin = true;
  next();
};
