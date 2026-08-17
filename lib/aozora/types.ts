export type AozoraContributor = {
  name: string
  nameKana: string
  role: string
}

export type AozoraWork = {
  id: string
  title: string
  titleKana: string
  subtitle: string
  orthography: string
  publishedAt: string
  cardUrl: string
  inputter: string
  proofreader: string
  textUrl: string
  textEncoding: string
  contributors: AozoraContributor[]
}

export type AozoraSearchResult = AozoraWork & {
  score: number | null
}

export const AOZORA_READER_COOKIE = 'balloon_reader'
