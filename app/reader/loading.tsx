export default function Loading() {
  return (
    <main
      className="min-h-dvh bg-[color-mix(in_oklch,var(--muted),var(--background)_45%)] p-8"
      aria-busy="true"
    >
      <div className="bg-muted mb-4 h-12 w-[min(40rem,80%)] animate-pulse rounded-lg" />
      <div className="bg-muted h-[70dvh] animate-pulse rounded-lg" />
    </main>
  )
}
