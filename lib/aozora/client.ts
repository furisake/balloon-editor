import 'server-only'

import Encoding from 'encoding-japanese'
import Fuse from 'fuse.js'

import { parseAozoraCatalog } from './csv'
import type { AozoraSearchResult, AozoraWork } from './types'
import { extractFirstFile } from './zip'

const CATALOG_URL =
  'https://www.aozora.gr.jp/index_pages/list_person_all_extended_utf8.zip'
const AOZORA_HOST = 'www.aozora.gr.jp'
const MAX_RESULTS = 40

function assertAozoraUrl(value: string): string {
  const url = new URL(value)
  if (url.protocol !== 'https:' || url.hostname !== AOZORA_HOST) {
    throw new Error('青空文庫以外のURLは取得できません。')
  }
  return url.toString()
}

export async function getAozoraCatalog(): Promise<AozoraWork[]> {
  const response = await fetch(CATALOG_URL, { cache: 'no-store' })
  if (!response.ok) {
    throw new Error(
      `青空文庫からデータを取得できませんでした (${response.status})。`,
    )
  }

  const archive = await response.arrayBuffer()
  const csv = new TextDecoder('utf-8').decode(extractFirstFile(archive))
  return parseAozoraCatalog(csv)
}

export async function searchAozoraWorks(
  query: string,
  works?: AozoraWork[],
): Promise<AozoraSearchResult[]> {
  const normalizedQuery = query.trim().slice(0, 100)
  if (!normalizedQuery) return []

  const index = new Fuse(works ?? (await getAozoraCatalog()), {
    includeScore: true,
    ignoreLocation: true,
    threshold: 0.35,
    minMatchCharLength: 1,
    keys: [
      { name: 'title', weight: 0.45 },
      { name: 'titleKana', weight: 0.2 },
      { name: 'subtitle', weight: 0.05 },
      { name: 'contributors.name', weight: 0.2 },
      { name: 'contributors.nameKana', weight: 0.1 },
    ],
  })
  return index
    .search(normalizedQuery, { limit: MAX_RESULTS })
    .map((result) => ({
      ...result.item,
      score: result.score ?? null,
    }))
}

export async function getAozoraWork(id: string): Promise<AozoraWork | null> {
  if (!/^\d{6}$/.test(id)) return null
  const works = await getAozoraCatalog()
  return works.find((work) => work.id === id) ?? null
}

export async function fetchAozoraText(
  textUrl: string,
  textEncoding: string,
): Promise<string> {
  const response = await fetch(assertAozoraUrl(textUrl), {
    cache: 'no-store',
  })

  if (!response.ok) {
    throw new Error(
      `青空文庫から本文を取得できませんでした (${response.status})。`,
    )
  }

  const archive = await response.arrayBuffer()
  const bytes = extractFirstFile(archive)

  if (/utf-?8/i.test(textEncoding)) {
    return new TextDecoder('utf-8').decode(bytes).replace(/^\uFEFF/, '')
  }

  return Encoding.convert(Array.from(bytes), {
    from: 'SJIS',
    to: 'UNICODE',
    type: 'string',
  }) as string
}
