import type { Metadata } from 'next'
import { cookies } from 'next/headers'
import Link from 'next/link'

import { AozoraWorkViewer } from '@/features/reader/components/reader'
import { getAozoraCatalog } from '@/lib/aozora/client'
import { AOZORA_READER_COOKIE } from '@/lib/aozora/types'

export const metadata: Metadata = {
  title: '青空文庫リーダー | Balloon',
  description: '青空文庫の作品を縦書き・横書きで読めるリーダー',
}

function single(value: string | string[] | undefined): string {
  return Array.isArray(value) ? (value[0] ?? '') : (value ?? '')
}

export default async function ReaderWorkPage({
  params,
  searchParams,
}: PageProps<'/reader/[id]'>) {
  const [{ id }, queryParams, cookieStore, catalog] = await Promise.all([
    params,
    searchParams,
    cookies(),
    getAozoraCatalog(),
  ])
  const work = catalog.find((candidate) => candidate.id === id) ?? null
  const returnQuery = single(queryParams.q).trim().slice(0, 100)
  const readerCookie = cookieStore.get(AOZORA_READER_COOKIE)?.value

  return (
    <main className="min-h-dvh bg-[color-mix(in_oklch,var(--muted),var(--background)_45%)]">
      <section className="min-h-dvh min-w-0 p-0 sm:p-[clamp(1rem,3vw,2.5rem)]">
        {work ? (
          <AozoraWorkViewer
            returnQuery={returnQuery}
            savedReaderCookie={readerCookie}
            work={work}
          />
        ) : (
          <div className="text-muted-foreground grid min-h-dvh place-items-center content-center gap-3 px-5 text-center">
            <h1 className="text-[1.1rem]">作品を開けませんでした</h1>
            <p className="text-[0.82rem]">
              作品情報が更新された可能性があります。
            </p>
            <Link className="text-sm font-semibold" href="/reader">
              本棚へ戻る
            </Link>
          </div>
        )}
      </section>
    </main>
  )
}
