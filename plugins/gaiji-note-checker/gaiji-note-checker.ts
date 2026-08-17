import { Extension } from '@tiptap/core'
import { Plugin, PluginKey } from '@tiptap/pm/state'
import { Decoration, DecorationSet } from '@tiptap/pm/view'
import { EditorPlugin } from '../plugin'
import {
  gaijiDictionaryJisCodes,
  gaijiDictionaryUnicodeCodes,
} from '../gaiji-note-dictionary'

type GaijiNoteIssue = {
  from: number
  to: number
  message: string
  severity: 'info' | 'warning'
}

type InclusionKind = '78互換包摂' | '包摂'

type Inclusion = {
  character: string
  kind: InclusionKind
}

const key = new PluginKey<boolean>('gaiji-note-checker')

const issueClassName = {
  info: 'rounded-xs bg-[oklch(0.92_0.08_145/50%)] shadow-[inset_0_-2px_0_oklch(0.58_0.16_145/75%)] hover:saturate-125 dark:bg-[oklch(0.46_0.11_145/40%)] dark:shadow-[inset_0_-2px_0_oklch(0.72_0.16_145/85%)]',
  warning:
    'rounded-xs bg-[oklch(0.9_0.13_75/55%)] shadow-[inset_0_-2px_0_oklch(0.62_0.18_55/85%)] hover:saturate-125 dark:bg-[oklch(0.5_0.13_65/42%)] dark:shadow-[inset_0_-2px_0_oklch(0.76_0.16_65/90%)]',
} as const
const notePattern = /※［＃[^\n］]{0,240}］/gu
const jisCodePattern = /(?:第([34])水準)?([12])-(\d{1,2})-(\d{1,2})/gu
const unicodeCodePattern = /U\+([0-9A-Fa-f]{4,6})/gu

function entries(value: string, kind: InclusionKind) {
  return value
    .trim()
    .split(/\s+/u)
    .map((entry) => {
      const [code, character] = entry.split(':')
      return [code, { character, kind }] as const
    })
}

// Ported from the inclusion tables used by Aozora Bunko's Character Checker.
const inclusionByCode = new Map<string, Inclusion>([
  ...entries(
    `
      1-15-8:唖 1-87-49:焔 1-94-69:鴎 1-15-26:噛 1-14-26:侠
      1-92-42:躯 1-94-74:鹸 1-94-79:麹 1-47-64:屡 1-90-22:繍
      1-91-22:蒋 1-92-89:醤 1-91-66:蝉 1-84-86:掻 1-94-20:騨
      1-89-73:箪 1-84-89:掴 1-15-56:填 1-94-3:顛 1-89-35:祷
      1-87-29:涜 1-15-32:嚢 1-87-9:溌 1-92-90:醗 1-93-90:頬
      1-94-80:麺 1-91-6:莱 1-91-71:蝋 1-85-6:攅
    `,
    '78互換包摂',
  ),
  ...entries(
    `
      1-14-24:侮 1-14-28:併 1-14-41:僧 1-14-48:免 1-14-67:勉
      1-14-72:勤 1-14-78:卑 1-14-81:即 1-15-12:喝 1-15-15:嘆
      1-15-22:器 1-15-55:塚 1-15-58:塀 1-15-61:増 1-15-62:墨
      1-47-58:寛 1-47-65:層 1-84-8:巣 1-84-14:廊 1-84-36:徴
      1-84-37:徳 1-84-48:悔 1-84-60:慨 1-84-62:憎 1-84-65:懲
      1-84-67:戻 1-84-83:掲 1-85-2:撃 1-85-8:敏 1-85-11:既
      1-85-28:晩 1-85-35:暑 1-85-39:暦 1-85-46:朗 1-85-69:梅
      1-86-4:概 1-86-16:横 1-86-27:欄 1-86-35:歩 1-86-37:歴
      1-86-41:殺 1-86-42:毎 1-86-73:海 1-86-76:渉 1-86-83:涙
      1-86-87:渚 1-86-88:渇 1-86-92:温 1-87-5:漢 1-87-30:瀬
      1-87-53:煮 1-87-74:状 1-87-79:猪 1-88-5:琢 1-88-39:瓶
      1-89-3:研 1-89-7:碑 1-89-19:社 1-89-20:祉 1-89-23:祈
      1-89-24:祐 1-89-25:祖 1-89-27:祝 1-89-28:神 1-89-29:祥
      1-89-31:禍 1-89-32:禎 1-89-33:福 1-89-45:穀 1-89-49:突
      1-89-68:節 1-90-8:緑 1-90-12:緒 1-90-13:縁 1-90-14:練
      1-90-19:繁 1-90-26:署 1-90-36:者 1-90-56:臭 1-91-7:著
      1-91-32:薫 1-91-46:虚 1-91-47:虜 1-91-79:褐 1-91-89:視
      1-92-14:諸 1-92-15:謁 1-92-16:謹 1-92-24:賓 1-92-26:頼
      1-92-29:贈 1-92-57:逸 1-92-71:郎 1-92-74:都 1-92-76:郷
      1-93-21:録 1-93-27:錬 1-93-61:隆 1-93-67:難 1-93-86:響
      1-93-91:頻 1-94-4:類 1-94-81:黄 1-94-82:黒
    `,
    '包摂',
  ),
])

function dictionaryLabel(level: string | undefined, code: string) {
  return level ? `第${level}水準${code}` : `面区点番号${code}`
}

export function findGaijiNoteIssues(text: string): GaijiNoteIssue[] {
  const issues: GaijiNoteIssue[] = []

  for (const noteMatch of text.matchAll(notePattern)) {
    if (noteMatch.index === undefined) continue
    const note = noteMatch[0]
    const noteStart = noteMatch.index
    let foundCode = false

    for (const match of note.matchAll(jisCodePattern)) {
      if (match.index === undefined) continue
      foundCode = true
      const code = `${match[2]}-${Number(match[3])}-${Number(match[4])}`
      const inclusion = inclusionByCode.get(code)

      if (inclusion) {
        issues.push({
          from: noteStart,
          to: noteStart + note.length,
          message: `${inclusion.kind}の対象です。外字注記ではなく「${inclusion.character}」で入力できます。`,
          severity: 'warning',
        })
        break
      }

      const packedCode =
        Number(match[2]) * 10_000 + Number(match[3]) * 100 + Number(match[4])
      const listed = gaijiDictionaryJisCodes.has(packedCode)
      issues.push({
        from: noteStart + match.index,
        to: noteStart + match.index + match[0].length,
        message: listed
          ? `${dictionaryLabel(match[1], code)}は外字注記辞書に掲載されています。字体表現と底本を確認してください。`
          : `${dictionaryLabel(match[1], code)}は外字注記辞書に見つかりません。面区点番号を確認してください。`,
        severity: listed ? 'info' : 'warning',
      })
    }

    for (const match of note.matchAll(unicodeCodePattern)) {
      if (match.index === undefined) continue
      foundCode = true
      const codePoint = Number.parseInt(match[1], 16)
      const listed = gaijiDictionaryUnicodeCodes.has(codePoint)
      issues.push({
        from: noteStart + match.index,
        to: noteStart + match.index + match[0].length,
        message: listed
          ? `U+${match[1].toUpperCase()}は外字注記辞書に掲載されています。字体表現と底本を確認してください。`
          : `U+${match[1].toUpperCase()}は外字注記辞書に見つかりません。Unicode番号を確認してください。`,
        severity: listed ? 'info' : 'warning',
      })
    }

    if (!foundCode && /(?:第[34]水準|U\+|Unicode)/u.test(note)) {
      issues.push({
        from: noteStart,
        to: noteStart + note.length,
        message:
          '外字注記の面区点番号またはUnicode番号の形式を確認してください。',
        severity: 'warning',
      })
    }
  }

  return issues
}

const extention = Extension.create({
  name: 'aozoraGaijiNoteChecker',

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

              for (const issue of findGaijiNoteIssues(node.text)) {
                decorations.push(
                  Decoration.inline(
                    position + issue.from,
                    position + issue.to,
                    {
                      class: issueClassName[issue.severity],
                      title: issue.message,
                      'data-gaiji-note-message': issue.message,
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

export const pluginGaijiNoteChecker: EditorPlugin = {
  name: '包摂・外字注記チェッカー',
  description: '外字注記辞書から面区点・Unicode・不要な包摂注記を点検します。',
  key,
  extention,
}
