import { Extension } from '@tiptap/core'
import { PluginKey } from '@tiptap/pm/state'

export interface EditorPlugin {
  name: string
  description: string
  key: PluginKey<boolean>
  extention: Extension
}
