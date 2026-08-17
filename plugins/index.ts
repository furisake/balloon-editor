export * from './plugin'
export * from './character-checker/character-checker'
export * from './gaiji-note-checker/gaiji-note-checker'
export * from './ocr-suspicious/ocr-suspicious'
export * from './whitespace-highlighting/whitespace-highlighting'

export const pluginNameList = [
  'character-checker',
  'gaiji-note-checker',
  'ocr-suspicious',
  'whitespace-highlighting',
] as const
export type PluginNames = (typeof pluginNameList)[number]
