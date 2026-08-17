import { PluginNames } from '@/plugins'
import type { JSONContent } from '@tiptap/react'

export type EditorDocument = JSONContent & {
  title: string
}

export type EditorSettings = {
  isVertical: boolean
  charactersPerLine: number | null

  pluginEnabled: Map<PluginNames, boolean>
}

export type LocalSaveData = {
  title: string
  text: string
  savedAt: string
}

export type DocumentStatistics = {
  characterCount: number
  lineCount: number
}

type WritableFile = {
  write: (data: string | BufferSource | Blob) => Promise<void>
  close: () => Promise<void>
}

export type BrowserFileHandle = {
  name: string
  getFile: () => Promise<File>
  createWritable: () => Promise<WritableFile>
}

export type FilePickerWindow = Window & {
  showOpenFilePicker?: (options: object) => Promise<BrowserFileHandle[]>
  showSaveFilePicker?: (options: object) => Promise<BrowserFileHandle>
}
