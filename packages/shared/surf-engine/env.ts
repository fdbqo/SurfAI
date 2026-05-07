/**
 * Surf Engine base URL for client-side calls.
 * - Next.js: set `NEXT_PUBLIC_ENGINE_URL`
 * - Expo: set `EXPO_PUBLIC_ENGINE_URL` (e.g. in `.env` or EAS env)
 *
 * In development, falls back to `http://localhost:3000` if unset.
 */
export function getEngineBaseUrl(): string {
  const fromEnv =
    (typeof process !== 'undefined' && process.env?.NEXT_PUBLIC_ENGINE_URL) ||
    (typeof process !== 'undefined' && process.env?.EXPO_PUBLIC_ENGINE_URL) ||
    ''

  const trimmed = String(fromEnv).trim().replace(/\/$/, '')
  if (trimmed) return trimmed

  if (typeof process !== 'undefined' && process.env?.NODE_ENV === 'development') {
    return 'http://localhost:3000'
  }

  throw new Error(
    'Surf Engine URL missing: set NEXT_PUBLIC_ENGINE_URL (Next) or EXPO_PUBLIC_ENGINE_URL (Expo).'
  )
}

/** Mock user id until JWT auth is wired; override via public env. */
export function getSurfEngineMockUserId(): string {
  return (
    (typeof process !== 'undefined' && process.env?.NEXT_PUBLIC_SURF_ENGINE_USER_ID) ||
    (typeof process !== 'undefined' && process.env?.EXPO_PUBLIC_SURF_ENGINE_USER_ID) ||
    'demo-user'
  )
}
