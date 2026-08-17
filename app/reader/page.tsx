import type { Metadata } from 'next'
import { cookies } from 'next/headers'
import Image from 'next/image'
import Link from 'next/link'

import { ShelfWork } from '@/features/reader/components/shelf-work'
import { getAozoraCatalog, searchAozoraWorks } from '@/lib/aozora/client'
import { parseReaderState, recentWorkIds } from '@/lib/aozora/reader-state'
import { AOZORA_READER_COOKIE, type AozoraWork } from '@/lib/aozora/types'

export const metadata: Metadata = {
  title: 'Balloon Reader',
  description: '作品名や著者名から青空文庫を検索して読めるリーダー',
}

function single(value: string | string[] | undefined): string {
  return Array.isArray(value) ? (value[0] ?? '') : (value ?? '')
}

function contributorLabel(work: AozoraWork): string {
  return work.contributors
    .map(({ name, role }) =>
      role && role !== '著者' ? `${name}（${role}）` : name,
    )
    .join('・')
}

export default async function ReaderPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>
}) {
  const params = await searchParams
  const readerCookie = (await cookies()).get(AOZORA_READER_COOKIE)?.value
  const query = single(params.q).trim().slice(0, 100)
  const readerState = parseReaderState(readerCookie)
  const shelfIds = recentWorkIds(readerState)
  const catalog = query || shelfIds.length ? await getAozoraCatalog() : []
  const results = query ? await searchAozoraWorks(query, catalog) : []
  const worksById = new Map(catalog.map((work) => [work.id, work]))
  const shelfWorks = shelfIds.flatMap((id) => {
    const work = worksById.get(id)
    return work ? [work] : []
  })

  return (
    <main className="min-h-dvh bg-[color-mix(in_oklch,var(--muted),var(--background)_45%)]">
      <header className="bg-background flex h-14 items-center border-b px-4 font-sans sm:px-6">
        <Link
          aria-label="ホームに戻る"
          className="text-foreground flex shrink-0 items-center gap-3 no-underline"
          href="/"
        >
          <span className="grid size-8 place-items-center overflow-hidden rounded-md">
            <Image
              alt=""
              aria-hidden="true"
              className="size-8 object-cover"
              height={32}
              src="/balloon-icon.png"
              width={32}
            />
          </span>
          <div className="hidden lg:block">
            <h1 className="font-heading text-sm font-semibold tracking-tight">
              Balloon Reader
            </h1>
            <p className="text-muted-foreground hidden text-[10px] sm:block">
              青空文庫 閲覧ツール
            </p>
          </div>
        </Link>
      </header>

      {shelfWorks.length > 0 && (
        <section
          className="border-b bg-[color-mix(in_oklab,var(--muted)_45%,var(--background))] px-[clamp(1rem,4vw,3rem)] py-5"
          aria-labelledby="reader-shelf-title"
        >
          <div className="mb-[0.8rem] flex items-baseline gap-3">
            <h2 id="reader-shelf-title">本棚</h2>
            <p className="text-muted-foreground text-[0.72rem]">
              最近読んだ作品
            </p>
          </div>
          <ol className="grid auto-cols-[minmax(8.5rem,10.5rem)] grid-flow-col gap-[0.65rem] overflow-x-auto pb-[0.35rem]">
            {shelfWorks.map((work) => (
              <ShelfWork
                contributor={contributorLabel(work)}
                key={work.id}
                title={work.title}
                workId={work.id}
              />
            ))}
          </ol>
        </section>
      )}

      <section
        className="bg-card border-b px-[clamp(1rem,4vw,3rem)] py-4"
        aria-label="作品検索"
      >
        <form className="w-[min(46rem,100%)]" action="/reader" method="get">
          <label
            className="mb-[0.4rem] block font-sans text-[0.72rem] font-semibold"
            htmlFor="reader-query"
          >
            作品を探す
          </label>
          <div className="flex gap-2">
            <input
              autoComplete="off"
              defaultValue={query}
              id="reader-query"
              name="q"
              placeholder="例：銀河鉄道の夜、宮沢賢治"
              type="search"
              className="border-input bg-background focus:border-primary h-11 min-w-0 flex-1 rounded-lg border px-[0.9rem] font-sans text-sm outline-none focus:shadow-[0_0_0_3px_color-mix(in_oklch,var(--primary),transparent_82%)]"
            />
            <button
              className="bg-primary text-primary-foreground h-11 rounded-lg px-5 font-sans text-[0.82rem] font-semibold"
              type="submit"
            >
              検索
            </button>
          </div>
        </form>
      </section>

      <div className="grid min-h-[calc(100dvh-10rem)] grid-cols-1">
        <aside className="bg-background" aria-label="検索結果">
          {!query ? (
            <p className="text-muted-foreground p-4 font-sans text-xs">
              読みたい作品や作家を検索してください。
            </p>
          ) : results.length === 0 ? (
            <p className="text-muted-foreground p-4 font-sans text-xs">
              「{query}」に一致する作品はありません。
            </p>
          ) : (
            <>
              <p className="text-muted-foreground p-4 font-sans text-xs">
                検索結果 {results.length}件
              </p>
              <ol className="border-t">
                {results.map((work) => (
                  <li className="border-b" key={work.id}>
                    <Link
                      href={{
                        pathname: `/reader/${work.id}`,
                        query: { q: query },
                      }}
                      className="hover:bg-muted flex flex-col gap-1 p-4 text-inherit no-underline transition-colors duration-120"
                    >
                      <strong className="leading-normal">{work.title}</strong>
                      {work.subtitle && (
                        <span className="text-muted-foreground text-[0.78rem]">
                          {work.subtitle}
                        </span>
                      )}
                      <small className="font-sans text-[0.68rem] leading-normal">
                        {contributorLabel(work)}
                        {work.orthography ? ` · ${work.orthography}` : ''}
                      </small>
                    </Link>
                  </li>
                ))}
              </ol>
            </>
          )}
        </aside>
      </div>
    </main>
  )
}
