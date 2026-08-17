import { RiArrowLeftLine } from '@remixicon/react'
import Image from 'next/image'
import Link from 'next/link'

import { routes } from '@/routes'
import Doc from './doc.mdx'

export function Guide() {
  return (
    <main className="flex min-h-dvh flex-col font-sans">
      <header className="flex h-14 shrink-0 items-center justify-between border-b px-4 sm:px-6">
        <Link
          aria-label="ホームに戻る"
          className="text-foreground flex shrink-0 items-center gap-3 no-underline"
          href={routes.home}
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
          <div className="hidden sm:block">
            <p className="font-heading text-sm font-semibold tracking-tight">
              Balloon Guide
            </p>
            <p className="text-muted-foreground text-[10px]">
              青空文庫 ツールボックス
            </p>
          </div>
        </Link>

        <p className="absolute left-1/2 -translate-x-1/2 text-sm font-medium sm:hidden">
          ガイド
        </p>
      </header>

      <div className="flex min-h-0 flex-1 flex-col">
        <div className="flex min-h-11 shrink-0 items-center border-b px-3 py-1.5 sm:px-5">
          <Link
            className="text-muted-foreground hover:bg-muted hover:text-foreground focus-visible:outline-ring inline-flex h-7 items-center gap-1.5 px-2 text-xs transition-colors focus-visible:outline-2"
            href={routes.home}
          >
            <RiArrowLeftLine aria-hidden="true" className="size-3.5" />
            ホームに戻る
          </Link>
        </div>

        <div className="bg-muted/40 flex-1 p-3 sm:p-6 lg:p-8">
          <article className="bg-background mx-auto w-[min(48rem,100%)] border px-7 py-10 font-serif shadow-sm sm:px-[clamp(3rem,8vw,5rem)] sm:py-16">
            <Doc />
          </article>
        </div>
      </div>
    </main>
  )
}
