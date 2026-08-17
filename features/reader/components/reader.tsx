'use client'

import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import Link from 'next/link'

import {
  parseReaderState,
  type ReadingPosition,
  type WritingMode,
  withReadingPosition,
} from '@/lib/aozora/reader-state'
import { AOZORA_READER_COOKIE, type AozoraWork } from '@/lib/aozora/types'
import { cn } from '@/lib/utils'

import { Viewer } from '@/components/viewer/viewer'

function currentCookieValue(): string | undefined {
  const prefix = `${AOZORA_READER_COOKIE}=`
  return document.cookie
    .split('; ')
    .find((cookie) => cookie.startsWith(prefix))
    ?.slice(prefix.length)
}

function savePosition(workId: string, position: ReadingPosition) {
  const currentState = parseReaderState(currentCookieValue())
  const state = withReadingPosition(currentState, workId, position)
  const value = encodeURIComponent(JSON.stringify(state))
  document.cookie = `${AOZORA_READER_COOKIE}=${value}; Path=/reader; Max-Age=31536000; SameSite=Lax`
}

function characterFromHash(): number | null {
  const match = window.location.hash.match(/^#char-(\d+)$/)
  if (!match) return null
  const character = Number(match[1])
  return Number.isSafeInteger(character) && character >= 0 ? character : null
}

function replaceCharacterHash(character: number) {
  window.history.replaceState(
    null,
    '',
    `${window.location.pathname}${window.location.search}#char-${character}`,
  )
}

function keepVerticalPaddingVisible(container: HTMLElement) {
  container.scrollTop = 0
  requestAnimationFrame(() => {
    container.scrollTop = 0
  })
}

function bookmarkTargetInset(container: HTMLElement): number {
  return (
    (Number.parseFloat(window.getComputedStyle(container).fontSize) || 16) * 3
  )
}

function elementForCharacter(
  container: HTMLElement,
  character: number,
): HTMLElement | null {
  return (
    Array.from(
      container.querySelectorAll<HTMLElement>('[data-character-offset]'),
    ).find((element) => {
      const start = Number(element.dataset.characterOffset)
      const end = Number(element.dataset.characterEnd ?? start)
      return start <= character && character <= end
    }) ?? null
  )
}

function scrollToCharacter(
  container: HTMLElement,
  character: number,
  mode: WritingMode,
) {
  const target =
    container.querySelector<HTMLElement>(`[data-char-index="${character}"]`) ??
    elementForCharacter(container, character)
  if (!target) return

  const previousInlineEndMargin = target.style.scrollMarginInlineEnd
  const inset = bookmarkTargetInset(container)
  if (mode === 'vertical') {
    const targetWidth = target.getBoundingClientRect().width
    target.style.scrollMarginInlineEnd = `${Math.max(0, inset - targetWidth)}px`
    target.scrollIntoView({ block: 'nearest', inline: 'end' })
    target.style.scrollMarginInlineEnd = previousInlineEndMargin
    keepVerticalPaddingVisible(container)
  } else {
    const containerRect = container.getBoundingClientRect()
    const targetRect = target.getBoundingClientRect()
    const headerBottom =
      document
        .querySelector<HTMLElement>('[data-reader-work-header]')
        ?.getBoundingClientRect().bottom ?? 0
    const visibleTop = Math.max(0, headerBottom, containerRect.top)
    container.scrollTop += targetRect.top - visibleTop - inset
  }
}

function bookmarkVisibleCharacter(
  container: HTMLElement,
  mode: WritingMode,
): number | null {
  const containerRect = container.getBoundingClientRect()
  const headerBottom =
    document
      .querySelector<HTMLElement>('[data-reader-work-header]')
      ?.getBoundingClientRect().bottom ?? 0
  const visibleLeft = Math.max(0, containerRect.left)
  const visibleRight = Math.min(window.innerWidth, containerRect.right)
  const visibleTop = Math.max(0, headerBottom, containerRect.top)
  const visibleBottom = Math.min(window.innerHeight, containerRect.bottom)
  const targetInset = bookmarkTargetInset(container)
  const pointX =
    mode === 'vertical'
      ? Math.max(visibleLeft + 2, visibleRight - targetInset)
      : (visibleLeft + visibleRight) / 2
  const pointY = (visibleTop + visibleBottom) / 2
  const targetPointY =
    mode === 'vertical'
      ? pointY
      : Math.min(visibleBottom - 2, visibleTop + targetInset)
  const center = mode === 'vertical' ? pointX : targetPointY
  let numberedCharacter: HTMLElement | null = null
  if (mode === 'vertical') {
    for (let x = pointX; x >= Math.max(visibleLeft, pointX - 64); x -= 3) {
      const character = document
        .elementFromPoint(x, targetPointY)
        ?.closest<HTMLElement>('[data-char-index]')
      if (character && container.contains(character)) {
        numberedCharacter = character
        break
      }
    }
  } else {
    numberedCharacter =
      document
        .elementFromPoint(pointX, targetPointY)
        ?.closest<HTMLElement>('[data-char-index]') ?? null
  }
  if (numberedCharacter && container.contains(numberedCharacter)) {
    const index = Number(numberedCharacter.dataset.charIndex)
    if (Number.isSafeInteger(index)) return index
  }
  const caretDocument = document as Document & {
    caretRangeFromPoint?: (x: number, y: number) => Range | null
  }
  const caret = document.caretPositionFromPoint?.(pointX, targetPointY)
  const caretRange = caretDocument.caretRangeFromPoint?.(pointX, targetPointY)
  const directNode = caret?.offsetNode ?? caretRange?.startContainer
  const directOffset = caret?.offset ?? caretRange?.startOffset
  const directElement =
    directNode?.nodeType === Node.ELEMENT_NODE
      ? (directNode as Element)
      : directNode?.parentElement
  const directLine = directElement?.closest<HTMLElement>(
    '[data-character-offset]',
  )
  if (
    directLine &&
    container.contains(directLine) &&
    directNode &&
    directOffset !== undefined
  ) {
    const lineStart = Number(directLine.dataset.characterOffset)
    const lineEnd = Number(directLine.dataset.characterEnd ?? lineStart)
    try {
      const range = document.createRange()
      range.selectNodeContents(directLine)
      range.setEnd(directNode, directOffset)
      const character = lineStart + range.toString().length
      return Math.max(lineStart, Math.min(lineEnd, character))
    } catch {
      // Fall through to the visible-line calculation.
    }
  }
  const visibleLines = Array.from(
    container.querySelectorAll<HTMLElement>('[data-character-offset]'),
  )
    .map((line) => ({ line, rect: line.getBoundingClientRect() }))
    .filter(
      ({ rect }) =>
        rect.right > visibleLeft &&
        rect.left < visibleRight &&
        rect.bottom > visibleTop &&
        rect.top < visibleBottom,
    )
    .sort((first, second) => {
      const firstCenter =
        mode === 'vertical'
          ? (first.rect.left + first.rect.right) / 2
          : (first.rect.top + first.rect.bottom) / 2
      const secondCenter =
        mode === 'vertical'
          ? (second.rect.left + second.rect.right) / 2
          : (second.rect.top + second.rect.bottom) / 2
      return Math.abs(firstCenter - center) - Math.abs(secondCenter - center)
    })
  const selected = visibleLines[0]
  if (!selected) return null
  const lineStart = Number(selected.line.dataset.characterOffset)
  const lineEnd = Number(selected.line.dataset.characterEnd ?? lineStart)
  if (!Number.isSafeInteger(lineStart) || !Number.isSafeInteger(lineEnd)) {
    return null
  }

  const fallbackPointX =
    mode === 'vertical'
      ? (selected.rect.left + selected.rect.right) / 2
      : (visibleLeft + visibleRight) / 2
  const fallbackPointY =
    mode === 'vertical'
      ? (visibleTop + visibleBottom) / 2
      : (selected.rect.top + selected.rect.bottom) / 2
  const fallbackCaret = document.caretPositionFromPoint?.(
    fallbackPointX,
    fallbackPointY,
  )
  const fallbackRange = caretDocument.caretRangeFromPoint?.(
    fallbackPointX,
    fallbackPointY,
  )
  const offsetNode = fallbackCaret?.offsetNode ?? fallbackRange?.startContainer
  const offsetInNode = fallbackCaret?.offset ?? fallbackRange?.startOffset
  if (offsetNode && offsetInNode !== undefined) {
    try {
      const range = document.createRange()
      range.selectNodeContents(selected.line)
      range.setEnd(offsetNode, offsetInNode)
      return Math.min(lineEnd, lineStart + range.toString().length)
    } catch {
      // Fall back to the line start when the browser returns an unrelated node.
    }
  }
  return lineStart
}

function characterRectInLine(
  line: HTMLElement,
  characterOffset: number,
): DOMRect | null {
  const walker = document.createTreeWalker(line, NodeFilter.SHOW_TEXT)
  let remaining = characterOffset
  let node = walker.nextNode()
  while (node) {
    const length = node.textContent?.length ?? 0
    if (remaining < length) {
      const range = document.createRange()
      range.setStart(node, remaining)
      range.setEnd(node, Math.min(remaining + 1, length))
      return range.getBoundingClientRect()
    }
    remaining -= length
    node = walker.nextNode()
  }
  return null
}

function contributorLabel(work: AozoraWork): string {
  return work.contributors
    .map(({ name, role }) =>
      role && role !== '著者' ? `${name}（${role}）` : name,
    )
    .join('・')
}

export function AozoraWorkViewer({
  work,
  savedReaderCookie,
  returnQuery,
}: {
  work: AozoraWork
  savedReaderCookie?: string
  returnQuery: string
}) {
  const savedPosition = parseReaderState(savedReaderCookie).positions[work.id]
  const [mode, setMode] = useState<WritingMode>(
    savedPosition?.mode ?? 'horizontal',
  )
  const [bookmarkCharacter, setBookmarkCharacter] = useState<number | null>(
    savedPosition?.bookmarkCharacter ?? null,
  )
  const currentCharacterRef = useRef(savedPosition?.bookmarkCharacter ?? 0)
  const [text, setText] = useState<string | null>(null)
  const [error, setError] = useState(false)
  const viewerRef = useRef<HTMLElement>(null)
  const restoredRef = useRef(false)
  const pendingRestoreCharacterRef = useRef<number | null>(null)

  useEffect(() => {
    const controller = new AbortController()
    const params = new URLSearchParams({
      url: work.textUrl,
      encoding: work.textEncoding,
    })
    void fetch(`/api/aozora/text?${params}`, {
      cache: 'no-store',
      signal: controller.signal,
    })
      .then(async (response) => {
        if (!response.ok) throw new Error(await response.text())
        return response.text()
      })
      .then(setText)
      .catch((reason: unknown) => {
        if (reason instanceof DOMException && reason.name === 'AbortError')
          return
        setError(true)
      })
    return () => controller.abort()
  }, [work.textEncoding, work.textUrl])

  useEffect(() => {
    const container = viewerRef.current
    if (!container || text === null) return
    const isInitialRestore = !restoredRef.current
    const clientPosition = isInitialRestore
      ? parseReaderState(currentCookieValue() ?? savedReaderCookie).positions[
          work.id
        ]
      : undefined
    const restoreCharacter = isInitialRestore
      ? (characterFromHash() ?? clientPosition?.bookmarkCharacter ?? 0)
      : pendingRestoreCharacterRef.current
    restoredRef.current = true
    pendingRestoreCharacterRef.current = null

    if (isInitialRestore) {
      setBookmarkCharacter(clientPosition?.bookmarkCharacter ?? null)
    }

    let secondRestoreFrame = 0
    const restoreFrame = requestAnimationFrame(() => {
      secondRestoreFrame = requestAnimationFrame(() => {
        if (restoreCharacter === null) return
        scrollToCharacter(container, restoreCharacter, mode)
        currentCharacterRef.current = restoreCharacter
      })
    })

    const handleHashChange = () => {
      const character = characterFromHash()
      if (character === null) return
      scrollToCharacter(container, character, mode)
      currentCharacterRef.current = character
    }
    window.addEventListener('hashchange', handleHashChange)
    return () => {
      cancelAnimationFrame(restoreFrame)
      cancelAnimationFrame(secondRestoreFrame)
      window.removeEventListener('hashchange', handleHashChange)
    }
  }, [mode, savedReaderCookie, text, work.id])

  useEffect(() => {
    const container = viewerRef.current
    if (!container || text === null) return
    let frame = 0
    const updateCurrentCharacter = () => {
      cancelAnimationFrame(frame)
      frame = requestAnimationFrame(() => {
        const character = bookmarkVisibleCharacter(container, mode)
        if (character !== null) currentCharacterRef.current = character
      })
    }
    container.addEventListener('scroll', updateCurrentCharacter, {
      passive: true,
    })
    window.addEventListener('resize', updateCurrentCharacter)
    return () => {
      cancelAnimationFrame(frame)
      container.removeEventListener('scroll', updateCurrentCharacter)
      window.removeEventListener('resize', updateCurrentCharacter)
    }
  }, [mode, text])

  useLayoutEffect(() => {
    const container = viewerRef.current
    if (!container || bookmarkCharacter === null) return
    const line = elementForCharacter(container, bookmarkCharacter)
    if (!line) return
    const marker = document.createElement('span')
    const label = document.createElement('span')
    marker.setAttribute('aria-hidden', 'true')
    marker.className =
      mode === 'vertical'
        ? 'pointer-events-none absolute top-0 bottom-0 z-10 w-0.5 rounded-full bg-rose-300'
        : 'pointer-events-none absolute right-0 left-0 z-10 h-0.5 rounded-full bg-rose-300'
    label.textContent = 'しおり'
    label.className =
      mode === 'vertical'
        ? 'absolute top-2 left-1/2 -translate-x-1/2 rounded-full bg-rose-500 px-0.5 py-2 font-sans text-[0.55rem] leading-none font-bold tracking-[0.12em] whitespace-nowrap text-white shadow-sm [writing-mode:vertical-rl]'
        : 'absolute top-1/2 left-3 -translate-y-1/2 rounded-full bg-rose-500 px-2 py-0.5 font-sans text-[0.55rem] leading-none font-bold tracking-[0.08em] whitespace-nowrap text-white shadow-sm [writing-mode:horizontal-tb]'
    marker.append(label)
    line.append(marker)

    let frame = 0
    const positionMarker = () => {
      const lineStart = Number(line.dataset.characterOffset)
      const characterRect =
        container
          .querySelector<HTMLElement>(
            `[data-char-index="${bookmarkCharacter}"]`,
          )
          ?.getBoundingClientRect() ??
        characterRectInLine(line, Math.max(0, bookmarkCharacter - lineStart))
      if (!characterRect) return
      const lineRect = line.getBoundingClientRect()
      if (mode === 'vertical') {
        marker.style.left = `${characterRect.left - lineRect.left}px`
      } else {
        marker.style.top = `${characterRect.top - lineRect.top}px`
      }
    }
    const schedulePosition = () => {
      cancelAnimationFrame(frame)
      frame = requestAnimationFrame(positionMarker)
    }
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') schedulePosition()
    }
    const resizeObserver = new ResizeObserver(schedulePosition)
    resizeObserver.observe(container)
    resizeObserver.observe(line)
    window.addEventListener('pageshow', schedulePosition)
    document.addEventListener('visibilitychange', handleVisibilityChange)
    positionMarker()

    return () => {
      cancelAnimationFrame(frame)
      resizeObserver.disconnect()
      window.removeEventListener('pageshow', schedulePosition)
      document.removeEventListener('visibilitychange', handleVisibilityChange)
      marker.remove()
    }
  }, [bookmarkCharacter, mode, text])

  const changeMode = (nextMode: WritingMode) => {
    if (nextMode === mode || text === null) return
    const character = viewerRef.current
      ? (bookmarkVisibleCharacter(viewerRef.current, mode) ??
        currentCharacterRef.current)
      : currentCharacterRef.current
    pendingRestoreCharacterRef.current = character
    currentCharacterRef.current = character
    setMode(nextMode)
  }

  const addBookmark = () => {
    const character = viewerRef.current
      ? (bookmarkVisibleCharacter(viewerRef.current, mode) ??
        currentCharacterRef.current)
      : currentCharacterRef.current
    currentCharacterRef.current = character
    setBookmarkCharacter(character)
    replaceCharacterHash(character)
    savePosition(work.id, {
      bookmarkCharacter: character,
      mode,
      updatedAt: Date.now(),
    })
  }

  const returnToBookmark = () => {
    if (bookmarkCharacter === null) return
    replaceCharacterHash(bookmarkCharacter)
    if (viewerRef.current) {
      scrollToCharacter(viewerRef.current, bookmarkCharacter, mode)
      currentCharacterRef.current = bookmarkCharacter
    }
  }

  return (
    <>
      <header
        className={cn(
          'sticky top-0 z-30 mx-auto flex w-[min(48rem,100%)] flex-col items-start justify-between gap-3 border-b bg-[color-mix(in_oklab,var(--background)_94%,transparent)] px-5 pt-[max(1.25rem,env(safe-area-inset-top))] pb-5 backdrop-blur-[10px] sm:flex-row sm:items-end sm:gap-4 sm:px-6 sm:py-5',
          mode === 'vertical' && 'mb-4',
        )}
        data-reader-work-header
      >
        <div className="min-w-0">
          <p className="text-muted-foreground font-sans text-[0.72rem]">
            {contributorLabel(work)}
          </p>
          <h2 className="my-[0.15rem] text-[clamp(1.4rem,3vw,2rem)] leading-tight break-words">
            {work.title}
          </h2>
          {work.subtitle && (
            <p className="text-muted-foreground font-sans text-[0.72rem]">
              {work.subtitle}
            </p>
          )}
        </div>
        <div className="flex w-full min-w-0 flex-none flex-col items-start gap-2 sm:w-auto sm:items-end">
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
            <Link
              className="flex-none font-sans text-[0.72rem] font-semibold"
              href={
                returnQuery
                  ? { pathname: '/reader', query: { q: returnQuery } }
                  : '/reader'
              }
            >
              ← {returnQuery ? '検索結果へ' : '本棚へ'}
            </Link>
            <a
              className="flex-none font-sans text-[0.72rem] font-semibold"
              href={work.cardUrl}
              rel="noreferrer"
              target="_blank"
            >
              図書カード ↗
            </a>
          </div>
          <div className="flex w-full flex-wrap items-center gap-2 sm:w-auto sm:justify-end sm:gap-3">
            <button
              className="bg-background text-primary rounded-[0.4rem] border px-[0.8rem] py-[0.4rem] font-sans text-[0.72rem] font-semibold"
              onClick={addBookmark}
              type="button"
            >
              しおりを挟む
            </button>
            {bookmarkCharacter !== null && (
              <button
                className="max-w-full rounded-[0.4rem] border border-[oklch(0.58_0.22_25)] bg-transparent px-[0.65rem] py-[0.4rem] font-sans text-[0.68rem] leading-snug font-semibold text-[oklch(0.55_0.22_25)]"
                onClick={returnToBookmark}
                type="button"
              >
                しおりへ戻る
              </button>
            )}
            <button
              aria-label={`${mode === 'horizontal' ? '縦書き' : '横書き'}に切り替える`}
              className="bg-background text-muted-foreground rounded-[0.4rem] border px-[0.8rem] py-[0.4rem] font-sans text-[0.72rem] font-semibold"
              onClick={() =>
                changeMode(mode === 'horizontal' ? 'vertical' : 'horizontal')
              }
              type="button"
            >
              {mode === 'horizontal' ? '縦書き' : '横書き'}
            </button>
          </div>
        </div>
      </header>

      {error ? (
        <div
          className="text-muted-foreground grid min-h-96 place-items-center content-center gap-2 text-center"
          role="alert"
        >
          <h2 className="text-[1.1rem]">本文を取得できませんでした</h2>
          <p className="text-[0.82rem]">
            しばらく待ってから、作品を選び直してください。
          </p>
        </div>
      ) : text === null ? (
        <p className="text-muted-foreground mx-auto w-[min(48rem,100%)] px-5 py-4 font-sans text-xs sm:px-6">
          本文を読み込んでいます…
        </p>
      ) : (
        <Viewer
          articleClassName={
            mode === 'vertical'
              ? '!h-[calc(100svh-14rem)] !min-h-80 !w-[min(48rem,100%)] touch-pan-x overscroll-y-none sm:!h-[calc(100dvh-12rem)] sm:!min-h-112'
              : '!h-[calc(100svh-14rem)] !min-h-80 !overflow-y-auto sm:!h-[calc(100dvh-12rem)] sm:!min-h-112'
          }
          articleRef={viewerRef}
          bookmarkCharacterOffset={bookmarkCharacter}
          charactersPerLine={null}
          text={text}
          vertical={mode === 'vertical'}
        />
      )}
    </>
  )
}
