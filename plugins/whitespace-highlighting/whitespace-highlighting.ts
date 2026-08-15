import { Extension } from "@tiptap/core";
import { Plugin, PluginKey } from "@tiptap/pm/state";
import { Decoration, DecorationSet } from "@tiptap/pm/view";
import { EditorPlugin } from "../plugin";

const key = new PluginKey<boolean>("whitespace-highlighting");

function createNewlineMarker() {
  const marker = document.createElement("span");
  marker.className = "aozora-newline-marker";
  marker.textContent = "↵";
  marker.title = "改行";
  marker.setAttribute("aria-hidden", "true");
  marker.setAttribute("contenteditable", "false");
  return marker;
}

const extention = Extension.create({
  name: "aozoraWhitespaceHighlighting",

  addProseMirrorPlugins() {
    return [
      new Plugin<boolean>({
        key,
        state: {
          init: () => true,
          apply(transaction, enabled) {
            const nextEnabled = transaction.getMeta(key);
            return typeof nextEnabled === "boolean" ? nextEnabled : enabled;
          },
        },
        props: {
          decorations(state) {
            if (!key.getState(state)) return DecorationSet.empty;

            const decorations: Decoration[] = [];

            state.doc.descendants((node, position) => {
              if (node.isText && node.text) {
                for (const match of node.text.matchAll(/[ \u3000]/gu)) {
                  if (match.index === undefined) continue;

                  const isFullwidth = match[0] === "　";
                  decorations.push(
                    Decoration.inline(
                      position + match.index,
                      position + match.index + 1,
                      {
                        class: `aozora-space-marker ${
                          isFullwidth
                            ? "aozora-space-marker-fullwidth"
                            : "aozora-space-marker-halfwidth"
                        }`,
                        title: isFullwidth ? "全角スペース" : "半角スペース",
                        "data-space-marker": isFullwidth ? "□" : "·",
                      },
                    ),
                  );
                }
                return;
              }

              if (node.type.name === "hardBreak") {
                decorations.push(
                  Decoration.widget(position, createNewlineMarker, {
                    key: `hard-break-${position}`,
                    side: -1,
                  }),
                );
                return;
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
                );
              }
            });

            return DecorationSet.create(state.doc, decorations);
          },
        },
      }),
    ];
  },
});

export const pluginWhitespaceHighlighting: EditorPlugin = {
  name: "スペース・改行の強調",
  description: "半角・全角スペースと改行位置を記号で表示します。",
  key,
  extention,
};
