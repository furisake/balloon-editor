import Encoding from 'encoding-japanese'
import { Extension } from '@tiptap/core'
import { Plugin, PluginKey } from '@tiptap/pm/state'
import { Decoration, DecorationSet } from '@tiptap/pm/view'
import { EditorPlugin } from '../plugin'

type CharacterIssue = {
  from: number
  to: number
  message: string
}

const key = new PluginKey<boolean>('character-checker')

const controlPattern = /[\u0000-\u0009\u000b\u000c\u000e-\u001f\u007f-\u009f]/u
const halfwidthKatakanaPattern = /[\uff61-\uff9f]/u

// CP932 uses these Unicode characters for code points whose JIS X 0208
// mappings use the corresponding characters in `jisMappingExceptions`.
const cp932OnlyVariants = new Set(['～', '∥', '－', '￠', '￡', '￢'])
const jisMappingExceptions = new Set(['〜', '‖', '−', '¢', '£', '¬'])

function canEncodeAsJisX0208(character: string) {
  if (jisMappingExceptions.has(character)) return true
  if (cp932OnlyVariants.has(character)) return false

  let bytes: number[]
  try {
    bytes = Encoding.convert(Encoding.stringToCode(character), {
      from: 'UNICODE',
      to: 'SJIS',
      fallback: 'error',
    })
  } catch {
    return false
  }

  if (bytes.length === 1) return bytes[0] <= 0x7f
  if (bytes.length !== 2) return false

  const [lead, trail] = bytes
  if (trail === 0x7f || trail < 0x40 || trail > 0xfc) return false

  // JIS X 0208 rows 1–94 end at 0xeffc. CP932 additionally assigns the
  // otherwise unused row 13 and vendor-extension ranges from 0xed onward.
  if (lead === 0x87 && trail <= 0x9c) return false
  return (lead >= 0x81 && lead <= 0x9f) || (lead >= 0xe0 && lead <= 0xea)
}

function issueForCharacter(character: string): string | null {
  const codePoint = character.codePointAt(0) ?? 0

  if (controlPattern.test(character)) {
    return `制御文字 U+${codePoint.toString(16).toUpperCase().padStart(4, '0')}`
  }
  if (halfwidthKatakanaPattern.test(character)) return '半角カタカナ'
  if (character === ' ') return '半角スペース'
  if (character === '～')
    return '全角チルダ（波ダッシュ「〜」を確認してください）'
  if (character === '(' || character === ')') return '半角括弧'
  if (!canEncodeAsJisX0208(character)) return 'JIS X 0208外の文字'

  return null
}

export function findCharacterCheckerIssues(text: string): CharacterIssue[] {
  const issues: CharacterIssue[] = []

  let index = 0
  for (const character of text) {
    const length = character.length
    const message = issueForCharacter(character)
    if (message) issues.push({ from: index, to: index + length, message })
    index += length
  }

  return issues.sort((left, right) => left.from - right.from)
}

const extention = Extension.create({
  name: 'aozoraCharacterChecker',

  addProseMirrorPlugins() {
    return [
      new Plugin<boolean>({
        key,
        state: {
          init: () => true,
          apply(transaction, enabled) {
            const nextEnabled = transaction.getMeta(key)
            return typeof nextEnabled === 'boolean' ? nextEnabled : enabled
          },
        },
        props: {
          decorations(state) {
            if (!key.getState(state)) return DecorationSet.empty

            const decorations: Decoration[] = []
            state.doc.descendants((node, position) => {
              if (!node.isText || !node.text) return

              for (const issue of findCharacterCheckerIssues(node.text)) {
                decorations.push(
                  Decoration.inline(
                    position + issue.from,
                    position + issue.to,
                    {
                      class:
                        'rounded-xs bg-[oklch(0.91_0.09_20/55%)] shadow-[inset_0_-2px_0_oklch(0.58_0.22_25/85%)] hover:bg-[oklch(0.84_0.14_25/60%)] dark:bg-[oklch(0.5_0.13_25/40%)] dark:shadow-[inset_0_-2px_0_oklch(0.72_0.18_25/90%)]',
                      title: issue.message,
                      'data-character-checker-message': issue.message,
                    },
                  ),
                )
              }
            })

            return DecorationSet.create(state.doc, decorations)
          },
        },
      }),
    ]
  },
})

export const pluginCharacterChecker: EditorPlugin = {
  name: '文字チェッカー',
  description: 'JIS外字、半角文字、全角チルダを検出します。',
  key,
  extention,
}
