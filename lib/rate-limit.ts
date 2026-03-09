import { Ratelimit } from '@upstash/ratelimit';
import { redis } from './redis';

/**
 * Returns null when Redis is not configured (local dev without env vars).
 */
function createRatelimit(prefix: string, limit: number, window: Parameters<typeof Ratelimit.slidingWindow>[1]) {
  if (!process.env.KV_REST_API_URL || !process.env.KV_REST_API_TOKEN) {
    return null;
  }
  return new Ratelimit({
    redis,
    prefix: `ratelimit:${prefix}`,
    limiter: Ratelimit.slidingWindow(limit, window),
    analytics: false,
  });
}

// 5 sign-in attempts per 15 minutes per email
export const signInLimiter = createRatelimit('signin', 5, '15 m');

// 3 sign-up attempts per hour per IP
export const signUpLimiter = createRatelimit('signup', 3, '1 h');

// 3 forgot-password attempts per hour per email
export const forgotPasswordLimiter = createRatelimit('forgot-password', 3, '1 h');

/**
 * Check rate limit. Returns { error } if exceeded, undefined if allowed.
 * Gracefully returns undefined if limiter is null (Redis not configured).
 */
export async function checkRateLimit(
  limiter: Ratelimit | null,
  identifier: string
): Promise<{ error: string } | undefined> {
  if (!limiter) return undefined;
  try {
    const { success } = await limiter.limit(identifier);
    if (!success) {
      return { error: 'Too many attempts. Please try again later.' };
    }
  } catch {
    // Fail open — don't block users if Redis is down
  }
  return undefined;
}
