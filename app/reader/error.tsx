'use client'

export default function ErrorPage({ reset }: { reset: () => void }) {
  return (
    <main className="min-h-dvh bg-[color-mix(in_oklch,var(--muted),var(--background)_45%)]">
      <div
        className="text-muted-foreground grid min-h-96 place-items-center content-center gap-2 text-center"
        role="alert"
      >
        <h1 className="text-[1.1rem]">青空文庫に接続できませんでした</h1>
        <p className="text-[0.82rem]">
          しばらく待ってから、もう一度お試しください。
        </p>
        <button
          className="bg-primary text-primary-foreground mt-4 h-11 rounded-lg px-5 font-sans text-[0.82rem] font-semibold"
          onClick={reset}
          type="button"
        >
          再試行
        </button>
      </div>
    </main>
  )
}
