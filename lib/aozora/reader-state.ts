export type WritingMode = 'horizontal' | 'vertical'

export type ReadingPosition = {
  bookmarkCharacter?: number
  mode: WritingMode
  updatedAt: number
}

export type ReaderState = {
  version: 4
  positions: Record<string, ReadingPosition>
}

export const MAX_SAVED_WORKS = 10

export function parseReaderState(value?: string): ReaderState {
  if (!value) return { version: 4, positions: {} }

  let decoded = value
  for (let attempt = 0; attempt < 3; attempt += 1) {
    try {
      const parsed = JSON.parse(decoded) as {
        version?: number
        positions?: Record<string, ReadingPosition>
      }
      if (
        (parsed.version === 3 || parsed.version === 4) &&
        parsed.positions &&
        typeof parsed.positions === 'object'
      ) {
        return {
          version: 4,
          positions: Object.fromEntries(
            Object.entries(parsed.positions).map(([id, position]) => [
              id,
              {
                bookmarkCharacter: position.bookmarkCharacter,
                mode: position.mode,
                updatedAt: position.updatedAt,
              },
            ]),
          ),
        }
      }
      return { version: 4, positions: {} }
    } catch {
      try {
        const next = decodeURIComponent(decoded)
        if (next === decoded) break
        decoded = next
      } catch {
        break
      }
    }
  }

  return { version: 4, positions: {} }
}

export function recentWorkIds(state: ReaderState): string[] {
  return Object.entries(state.positions)
    .sort(([, first], [, second]) => second.updatedAt - first.updatedAt)
    .slice(0, MAX_SAVED_WORKS)
    .map(([id]) => id)
}

export function withReadingPosition(
  state: ReaderState,
  workId: string,
  position: ReadingPosition,
): ReaderState {
  const positions = { ...state.positions, [workId]: position }
  const recent = recentWorkIds({ version: 4, positions })
  return {
    version: 4,
    positions: Object.fromEntries(recent.map((id) => [id, positions[id]])),
  }
}

export function withoutReadingPosition(
  state: ReaderState,
  workId: string,
): ReaderState {
  const positions = { ...state.positions }
  delete positions[workId]
  return { version: 4, positions }
}
