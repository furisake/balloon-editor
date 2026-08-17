import { cookies } from 'next/headers'

import {
  parseReaderState,
  recentWorkIds,
  withoutReadingPosition,
} from '@/lib/aozora/reader-state'
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

export async function DELETE(request: Request) {
  const body = (await request.json().catch(() => null)) as {
    workId?: unknown
  } | null
  if (
    !body ||
    typeof body.workId !== 'string' ||
    body.workId.length === 0 ||
    body.workId.length > 64
  ) {
    return new Response(null, { status: 400 })
  }

  const cookieStore = await cookies()
  const state = parseReaderState(cookieStore.get(AOZORA_READER_COOKIE)?.value)
  const nextState = withoutReadingPosition(state, body.workId)
  const hasSavedWorks = recentWorkIds(nextState).length > 0

  cookieStore.set(
    AOZORA_READER_COOKIE,
    hasSavedWorks ? encodeURIComponent(JSON.stringify(nextState)) : '',
    {
      maxAge: hasSavedWorks ? 31_536_000 : 0,
      path: '/reader',
      sameSite: 'lax',
    },
  )

  return new Response(null, {
    status: 204,
    headers: { 'Cache-Control': 'no-store' },
  })
}
