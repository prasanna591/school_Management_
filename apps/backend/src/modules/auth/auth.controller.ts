import type { Request, Response } from 'express';
import type { Role } from '@smartschool/shared';
import { env, isProduction } from '../../config/env';
import { ApiError } from '../../errors/ApiError';
import { parseDuration } from '../../utils/duration';
import { authService, type RequestMeta } from './auth.service';

const REFRESH_COOKIE = 'smartschool_refresh';
const REFRESH_COOKIE_MAX_AGE = parseDuration(env.JWT_REFRESH_EXPIRES_IN, 7 * 24 * 60 * 60 * 1000);

/**
 * Header a native client sends to receive the refresh token in the JSON body.
 *
 * React Native has no cookie jar, so the httpOnly cookie never survives on a
 * device. Requests that identify as native get the token in the body instead;
 * browsers keep the cookie-only flow so an XSS in the web app still cannot
 * read the refresh token.
 */
const NATIVE_CLIENT_HEADER = 'x-client-platform';

function wantsRefreshTokenInBody(req: Request): boolean {
  return String(req.headers[NATIVE_CLIENT_HEADER] ?? '').toLowerCase() === 'mobile';
}

function requestMeta(req: Request): RequestMeta {
  return {
    userAgent: req.headers['user-agent'],
    ipAddress: req.ip,
  };
}

function setRefreshCookie(res: Response, token: string): void {
  res.cookie(REFRESH_COOKIE, token, {
    httpOnly: true,
    secure: isProduction,
    sameSite: 'lax',
    path: '/',
    maxAge: REFRESH_COOKIE_MAX_AGE,
  });
}

function clearRefreshCookie(res: Response): void {
  res.clearCookie(REFRESH_COOKIE, { path: '/' });
}

function extractRefreshToken(req: Request): string | undefined {
  const fromBody = (req.body as { refreshToken?: string }).refreshToken;
  const fromCookie = (req.cookies as Record<string, string> | undefined)?.[REFRESH_COOKIE];
  return fromBody ?? fromCookie;
}

async function loginWithRoles(req: Request, res: Response, allowedRoles?: readonly Role[]) {
  const result = await authService.login(req.body, requestMeta(req), allowedRoles);
  setRefreshCookie(res, result.tokens.refreshToken);
  res.status(200).json({
    success: true,
    data: {
      user: result.user,
      accessToken: result.tokens.accessToken,
      ...(wantsRefreshTokenInBody(req) ? { refreshToken: result.tokens.refreshToken } : {}),
    },
  });
}

export const authController = {
  async login(req: Request, res: Response) {
    await loginWithRoles(req, res);
  },

  /** Dedicated portal sign-in for administrators/platform staff. */
  async loginAdmin(req: Request, res: Response) {
    await loginWithRoles(req, res, ['SUPER_ADMIN', 'PRINCIPAL', 'ADMIN', 'ACCOUNTANT', 'LIBRARIAN', 'TRANSPORT_MANAGER']);
  },

  /** Dedicated portal sign-in for teachers. */
  async loginTeacher(req: Request, res: Response) {
    await loginWithRoles(req, res, ['TEACHER']);
  },

  /** Dedicated portal sign-in for parents. */
  async loginParent(req: Request, res: Response) {
    await loginWithRoles(req, res, ['PARENT']);
  },

  async register(req: Request, res: Response) {
    const result = await authService.register(req.body, requestMeta(req));
    res.status(201).json({
      success: true,
      data: { user: result.user, accessToken: result.tokens.accessToken },
    });
  },

  async refresh(req: Request, res: Response) {
    const token = extractRefreshToken(req);
    if (!token) {
      throw ApiError.unauthorized('Refresh token is required');
    }

    const result = await authService.refresh(token, requestMeta(req));
    setRefreshCookie(res, result.tokens.refreshToken);
    res.status(200).json({
      success: true,
      data: {
        user: result.user,
        accessToken: result.tokens.accessToken,
        ...(wantsRefreshTokenInBody(req) ? { refreshToken: result.tokens.refreshToken } : {}),
      },
    });
  },

  async logout(req: Request, res: Response) {
    const token = extractRefreshToken(req);
    if (token) {
      await authService.logout(token);
    }
    clearRefreshCookie(res);
    res.status(200).json({ success: true, data: { message: 'Logged out' } });
  },

  async me(req: Request, res: Response) {
    const user = await authService.me(req.user!.id);
    res.status(200).json({ success: true, data: { user } });
  },

  async changePassword(req: Request, res: Response) {
    const { currentPassword, newPassword } = req.body as {
      currentPassword: string;
      newPassword: string;
    };
    await authService.changePassword(req.user!.id, currentPassword, newPassword);
    clearRefreshCookie(res);
    res.status(200).json({ success: true, data: { message: 'Password updated' } });
  },
};
