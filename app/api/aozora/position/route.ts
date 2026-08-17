import { cookies } from 'next/headers'

import { parseReaderState, recentWorkIds } from '@/lib/aozora/reader-state'
import { AOZORA_READER_COOKIE } from '@/lib/aozora/types'

export async function POST(request: Request) {
  const body = (await request.json().catch(() => null)) as {
    value?: unknown
  } | null
  if (!body || typeof body.value !== 'string' || body.value.length > 3_800) {
    return new Response(null, { status: 400 })
  }

  const state = parseReaderState(body.value)
  if (recentWorkIds(state).length === 0) {
    return new Response(null, { status: 400 })
  }

  ;(await cookies()).set(AOZORA_READER_COOKIE, body.value, {
    maxAge: 31_536_000,
    path: '/reader',
    sameSite: 'lax',
  })
  return new Response(null, {
    status: 204,
    headers: { 'Cache-Control': 'no-store' },
  })
}
