import { fetchAozoraText } from '@/lib/aozora/client'

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const url = searchParams.get('url')
  const encoding = searchParams.get('encoding')

  if (!url || !encoding) {
    return new Response('本文の取得情報が不足しています。', { status: 400 })
  }

  try {
    const text = await fetchAozoraText(url, encoding)
    return new Response(text, {
      headers: {
        'Cache-Control': 'no-store',
        'Content-Type': 'text/plain; charset=utf-8',
      },
    })
  } catch (error) {
    const message =
      error instanceof Error ? error.message : '本文を取得できませんでした。'
    return new Response(message, {
      status: 502,
      headers: { 'Cache-Control': 'no-store' },
    })
  }
}
