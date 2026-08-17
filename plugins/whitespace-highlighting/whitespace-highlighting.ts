import { Extension } from '@tiptap/core'
import { Plugin, PluginKey } from '@tiptap/pm/state'
import { Decoration, DecorationSet } from '@tiptap/pm/view'
import { EditorPlugin } from '../plugin'

const key = new PluginKey<boolean>('whitespace-highlighting')

function createNewlineMarker() {
  const marker = document.createElement('span')
  marker.className =
    'mx-[0.15em] inline-block align-[0.08em] font-sans text-[0.72em] leading-none text-[oklch(0.53_0.15_245/80%)] select-none dark:text-[oklch(0.76_0.12_235)]'
  marker.textContent = '↵'
  marker.title = '改行'
  marker.setAttribute('aria-hidden', 'true')
  marker.setAttribute('contenteditable', 'false')
  return marker
}

const extention = Extension.create({
  name: 'aozoraWhitespaceHighlighting',

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
              if (node.isText && node.text) {
                for (const match of node.text.matchAll(/[ \u3000]/gu)) {
                  if (match.index === undefined) continue

                  const isFullwidth = match[0] === '　'
                  decorations.push(
                    Decoration.inline(
                      position + match.index,
                      position + match.index + 1,
                      {
                        class: `relative rounded-xs bg-[oklch(0.9_0.08_235/45%)] after:pointer-events-none after:absolute after:inset-0 after:grid after:place-items-center after:font-sans after:text-[0.8em] after:leading-none after:text-[oklch(0.5_0.16_245)] after:content-[attr(data-space-marker)] dark:bg-[oklch(0.46_0.1_245/38%)] dark:after:text-[oklch(0.76_0.12_235)] ${
                          isFullwidth
                            ? 'shadow-[inset_0_0_0_1px_oklch(0.65_0.12_235/45%)]'
                            : ''
                        }`,
                        title: isFullwidth ? '全角スペース' : '半角スペース',
                        'data-space-marker': isFullwidth ? '□' : '·',
                      },
                    ),
                  )
                }
                return
              }

              if (node.type.name === 'hardBreak') {
                decorations.push(
                  Decoration.widget(position, createNewlineMarker, {
                    key: `hard-break-${position}`,
                    side: -1,
                  }),
                )
                return
              }

              if (
                node.isTextblock &&
                position + node.nodeSize < state.doc.content.size
              ) {
                decorations.push(
                  Decoration.widget(
                    position + node.nodeSize - 1,
                    createNewlineMarker,
                    {
                      key: `block-break-${position}`,
                      side: 1,
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

export const pluginWhitespaceHighlighting: EditorPlugin = {
  name: 'スペース・改行の強調',
  description: '半角・全角スペースと改行位置を記号で表示します。',
  key,
  extention,
}
