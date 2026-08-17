import { type CSSProperties, type Ref, ReactNode } from 'react'
import { cn } from '@/lib/utils'
import {
  AOZORA_MARKER_PAGE_BREAK,
  AOZORA_PATTERN_HEADING_PATTERN,
} from '@/constants/aozora'

function renderCharacters(text: string, start: number): ReactNode[] {
  let offset = 0
  return Array.from(text).map((character) => {
    const characterIndex = start + offset
    offset += character.length
    return (
      <span
        data-char-index={characterIndex}
        key={`${characterIndex}-${character}`}
      >
        {character}
      </span>
    )
  })
}

function renderInline(
  line: string,
  lineOffset = 0,
  characterizeCharacters = false,
): ReactNode[] {
  const pattern =
    /｜([^《\n]+)《([^》\n]+)》|([仝々〆〇ヶ\u3400-\u9fff\uf900-\ufaff]+|[ぁ-ゖゝゞ]+|[ァ-ヺヽヾー]+|[A-Za-zＡ-Ｚａ-ｚ]+)《([^》\n]+)》|［＃([^］\n]+)］/gu
  const nodes: ReactNode[] = []
  let cursor = 0
  let match: RegExpExecArray | null

  while ((match = pattern.exec(line))) {
    if (match.index > cursor) {
      const text = line.slice(cursor, match.index)
      nodes.push(
        characterizeCharacters
          ? renderCharacters(text, lineOffset + cursor)
          : text,
      )
    }

    const base = match[1] ?? match[3]
    const reading = match[2] ?? match[4]
    const note = match[5]

    if (base && reading) {
      nodes.push(
        <ruby key={`${match.index}-${base}`}>
          {characterizeCharacters
            ? renderCharacters(
                base,
                lineOffset + match.index + (match[1] ? 1 : 0),
              )
            : base}
          <rp>（</rp>
          <rt>{reading}</rt>
          <rp>）</rp>
        </ruby>,
      )
    } else if (note) {
      nodes.push(
        <span
          className="text-muted-foreground font-sans text-[0.68em] tracking-normal"
          data-char-index={
            characterizeCharacters ? lineOffset + match.index : undefined
          }
          key={`${match.index}-${note}`}
        >
          ［＃{note}］
        </span>,
      )
    }

    cursor = pattern.lastIndex
  }

  if (cursor < line.length) {
    const text = line.slice(cursor)
    nodes.push(
      characterizeCharacters
        ? renderCharacters(text, lineOffset + cursor)
        : text,
    )
  }
  return nodes
}

export function Viewer({
  text,
  vertical,
  charactersPerLine,
  articleRef,
  articleClassName,
  startingCharacterOffset = 0,
  bookmarkCharacterOffset,
  characterizeCharacters = false,
}: {
  text: string
  vertical: boolean
  charactersPerLine: number | null
  articleRef?: Ref<HTMLElement>
  articleClassName?: string
  startingCharacterOffset?: number
  bookmarkCharacterOffset?: number | null
  characterizeCharacters?: boolean
}) {
  const lineLengthStyle =
    charactersPerLine === null
      ? undefined
      : ({ '--characters-per-line': charactersPerLine } as CSSProperties)
  const linesWithOffsets = text
    .replace(/\r\n/g, '\n')
    .split('\n')
    .map((line, index, lines) => ({
      line,
      offset:
        startingCharacterOffset +
        lines
          .slice(0, index)
          .reduce((total, previousLine) => total + previousLine.length + 1, 0),
    }))

  return (
    <article
      ref={articleRef}
      className={cn(
        'bg-background mx-auto border shadow-sm',
        vertical
          ? 'h-[calc(100dvh-15rem)] min-h-128 w-full overflow-x-auto overflow-y-hidden'
          : 'min-h-[calc(100dvh-15rem)] w-[min(48rem,100%)]',
        charactersPerLine !== null &&
          (vertical ? 'h-fit min-h-0' : 'w-fit max-w-none'),
        articleClassName,
      )}
      style={lineLengthStyle}
    >
      <div
        className={cn(
          'min-h-[calc(100dvh-15rem)] px-7 py-10 font-serif text-[0.9375rem] leading-loose tracking-[0.035em] sm:px-[clamp(2rem,8vw,5rem)] sm:py-16 sm:text-base [&_rt]:text-[0.55em] [&_rt]:tracking-normal [&_ruby]:[ruby-align:center]',
          vertical &&
            'h-full min-h-0 w-max min-w-full p-8 wrap-normal [text-orientation:upright] [writing-mode:vertical-rl] sm:p-14',
          charactersPerLine !== null &&
            (vertical
              ? 'box-content h-[calc(var(--characters-per-line)*1.035em)] min-h-0'
              : 'box-content w-[calc(var(--characters-per-line)*1.035em)]'),
        )}
        data-aozora-preview-text
        lang="ja"
      >
        {linesWithOffsets.map(({ line, offset: lineOffset }, index) => {
          if (line.trim() === AOZORA_MARKER_PAGE_BREAK) {
            return (
              <div
                className={cn(
                  "text-muted-foreground [&_span]:bg-background relative grid h-14 place-items-center font-sans text-[0.625rem] before:absolute before:inset-x-0 before:border-t before:border-dashed before:content-[''] [&_span]:relative [&_span]:px-3",
                  vertical &&
                    'h-full w-14 before:inset-x-auto before:inset-y-0 before:border-t-0 before:border-r [&_span]:px-0 [&_span]:py-3',
                )}
                data-character-offset={lineOffset}
                key={index}
              >
                <span>改ページ</span>
              </div>
            )
          }

          const heading = line.match(AOZORA_PATTERN_HEADING_PATTERN)
          const previewLine = heading ? line.replace(heading[0], '') : line
          const headingClass = heading
            ? cn(
                'font-semibold tracking-[0.08em]',
                heading[1] === '大' && 'py-[0.75em] text-[1.5em]',
                heading[1] === '中' && 'py-[0.5em] text-[1.25em]',
                heading[1] === '小' && 'text-[1.1em]',
              )
            : undefined
          const containsBookmark =
            bookmarkCharacterOffset !== null &&
            bookmarkCharacterOffset !== undefined &&
            bookmarkCharacterOffset >= lineOffset &&
            bookmarkCharacterOffset <= lineOffset + line.length

          return (
            <div
              className={cn(
                'min-h-[2em] whitespace-pre-wrap',
                vertical && 'min-h-0 min-w-[2em]',
                headingClass,
                containsBookmark && 'relative scroll-mbs-24',
              )}
              data-character-end={lineOffset + line.length}
              data-character-offset={lineOffset}
              id={
                containsBookmark ? `char-${bookmarkCharacterOffset}` : undefined
              }
              key={index}
            >
              {previewLine ? (
                renderInline(
                  previewLine,
                  lineOffset + (heading?.[0].length ?? 0),
                  characterizeCharacters || containsBookmark,
                )
              ) : (
                <br />
              )}
            </div>
          )
        })}
      </div>
    </article>
  )
}
