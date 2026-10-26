import rateLimit from 'express-rate-limit';
import type { Request } from 'express';
import { env, isProduction } from '../config/env';
import { verifyAccessToken } from '../utils/jwt';

const tooManyRequests = {
  success: false,
  error: { message: 'Too many requests, please try again later.', code: 'RATE_LIMITED' },
};

/**
 * Bucket authenticated traffic by user instead of IP.
 *
 * A class full of devices behind one school NAT shares a single public IP, so
 * IP-keyed limits throttle everybody as soon as a few people act at once. The
 * access token is verified here independently of the auth middleware (which
 * runs later in the chain); an invalid or missing token falls back to the IP.
 */
function requestKey(req: Request): string {
  const header = req.headers.authorization;
  if (header?.startsWith('Bearer ')) {
    try {
      const payload = verifyAccessToken(header.slice('Bearer '.length));
      if (payload.sub) return `user:${payload.sub}`;
    } catch {
      // Expired/invalid token: the request will be rejected by auth anyway.
    }
  }
  return `ip:${req.ip ?? req.socket.remoteAddress ?? 'unknown'}`;
}

/**
 * General API limiter. Read-only and preflight requests are exempt so that
 * normal browsing (the SPA issues many GETs) never trips the limit; only
 * mutating requests count against it.
 */
export const apiRateLimiter = rateLimit({
  windowMs: env.RATE_LIMIT_WINDOW_MS,
  max: env.DEMO_MODE ? Math.max(env.RATE_LIMIT_MAX, 2_000) : env.RATE_LIMIT_MAX,
  standardHeaders: true,
  legacyHeaders: false,
  skip: (req) => req.method === 'GET' || req.method === 'HEAD' || req.method === 'OPTIONS',
  keyGenerator: requestKey,
  validate: { xForwardedForHeader: false },
  message: tooManyRequests,
});

/**
 * Stricter limiter for credential endpoints to slow down brute-force attempts.
 * Relaxed in development and demos so local testing is not blocked.
 */
export const authRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: env.DEMO_MODE ? 1_000 : isProduction ? 20 : 500,
  standardHeaders: true,
  legacyHeaders: false,
  validate: { xForwardedForHeader: false },
  message: tooManyRequests,
});
