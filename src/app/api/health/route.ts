import { NextResponse } from 'next/server'
import { db } from '@/lib/db'

export const dynamic = 'force-dynamic'

/**
 * GET /api/health — deployment + database diagnostics.
 * Also used by the ESP32 station as a "server online" check.
 */
export async function GET() {
  const rawUrl = process.env.DATABASE_URL ?? ''
  const mode = rawUrl.startsWith('libsql://')
    ? 'turso (hosted libSQL)'
    : rawUrl.startsWith('file:')
      ? 'sqlite (local file)'
      : 'unset'

  // Catch the classic "pasted a truncated token ending in …" mistake early
  const token = process.env.DATABASE_AUTH_TOKEN ?? ''
  if (mode === 'turso (hosted libSQL)' && /[^\x20-\x7E]/.test(token)) {
    return NextResponse.json(
      {
        ok: false,
        mode,
        error:
          'DATABASE_AUTH_TOKEN contains invalid characters (like the … ellipsis) — the token was copied truncated. Re-copy the FULL token from chat or the Turso dashboard.',
      },
      { status: 500 }
    )
  }

  try {
    await db.$queryRawUnsafe('SELECT 1')
    const userCount = await db.user.count()
    return NextResponse.json({
      ok: true,
      mode,
      users: userCount,
      time: new Date().toISOString(),
    })
  } catch (e) {
    return NextResponse.json(
      {
        ok: false,
        mode,
        error: e instanceof Error ? e.message : 'Unknown database error',
        hint:
          mode === 'unset'
            ? 'DATABASE_URL is not set — add it in Vercel → Settings → Environment Variables, then Redeploy.'
            : 'Check that DATABASE_URL / DATABASE_AUTH_TOKEN are correct and the deployment was redeployed after saving them.',
      },
      { status: 500 }
    )
  }
}
