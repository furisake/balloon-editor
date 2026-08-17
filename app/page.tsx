import { routes } from '@/routes'
import Image from 'next/image'
import Link from 'next/link'

export default function Page() {
  return (
    <main className="bg-muted grid min-h-dvh place-items-center p-[clamp(1.5rem,5vw,4rem)]">
      <section className="bg-card text-card-foreground w-[min(56rem,100%)] rounded-xl border p-[clamp(2rem,5vw,4rem)] shadow-[0_1px_2px_oklch(0_0_0/5%),0_16px_40px_oklch(0_0_0/8%)]">
        <header className="grid grid-cols-1 items-center gap-6 border-b pb-8 text-center sm:grid-cols-[minmax(12rem,17.5rem)_1fr] sm:gap-[clamp(2rem,6vw,4rem)] sm:text-left">
          <Image
            src="/balloon-image.png"
            alt="赤い風船につかまって空を飛ぶ、双眼鏡を持った白い猫"
            width={300}
            height={300}
            sizes="(max-width: 640px) 70vw, 280px"
            quality={90}
            priority
            className="mx-auto h-auto w-[min(70vw,16rem)] rounded-[clamp(1.5rem,4vw,2.75rem)] shadow-[0_2px_4px_oklch(0_0_0/8%),0_18px_40px_oklch(0.58_0.18_250/22%)] sm:w-full"
          />
          <div>
            <h1 className="text-[clamp(2rem,5vw,3.25rem)] leading-tight tracking-[-0.025em]">
              Balloon
            </h1>
            <p className="text-muted-foreground mt-3 text-[clamp(1rem,2vw,1.15rem)] leading-[1.9]">
              青空文庫の閲覧・編集・校正を支援するWebツールです。
            </p>
          </div>
        </header>

        <nav
          className="mt-8 grid grid-cols-1 gap-4 sm:grid-cols-2"
          aria-label="メインメニュー"
        >
          <Link
            className="bg-background text-foreground hover:border-primary flex min-h-32 flex-col justify-center rounded-lg border p-6 no-underline transition-[border-color,box-shadow,transform] duration-150 hover:-translate-y-0.5 hover:shadow-[0_8px_24px_oklch(0_0_0/8%)]"
            href={routes.reader}
          >
            <strong className="text-[1.1rem]">青空文庫を読む</strong>
            <span className="text-muted-foreground mt-2 font-serif text-sm leading-[1.7] font-normal">
              作品や作家を検索して、本文をブラウザで読めます
            </span>
          </Link>
          <Link
            className="bg-background text-foreground hover:border-primary flex min-h-32 flex-col justify-center rounded-lg border p-6 no-underline transition-[border-color,box-shadow,transform] duration-150 hover:-translate-y-0.5 hover:shadow-[0_8px_24px_oklch(0_0_0/8%)]"
            href={routes.editor}
          >
            <strong className="text-[1.1rem]">エディタを開く</strong>
            <span className="text-muted-foreground mt-2 font-serif text-sm leading-[1.7] font-normal">
              テキストの編集・校正を始めます
            </span>
          </Link>
          <Link
            className="bg-background text-foreground hover:border-primary flex min-h-32 flex-col justify-center rounded-lg border p-6 no-underline transition-[border-color,box-shadow,transform] duration-150 hover:-translate-y-0.5 hover:shadow-[0_8px_24px_oklch(0_0_0/8%)]"
            href={routes.guide}
          >
            <strong className="text-[1.1rem]">ガイドを見る</strong>
            <span className="text-muted-foreground mt-2 font-serif text-sm leading-[1.7] font-normal">
              使い方やコントリビューションについて確認します
            </span>
          </Link>
        </nav>
      </section>
    </main>
  )
}
