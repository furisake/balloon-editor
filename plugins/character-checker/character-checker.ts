import Encoding from "encoding-japanese";
import { Extension } from "@tiptap/core";
import { Plugin, PluginKey } from "@tiptap/pm/state";
import { Decoration, DecorationSet } from "@tiptap/pm/view";
import { EditorPlugin } from "../plugin";

type InclusionKind = "78互換包摂" | "包摂";

type Inclusion = {
  character: string;
  kind: InclusionKind;
};

type CharacterIssue = {
  from: number;
  to: number;
  message: string;
};

const key = new PluginKey<boolean>("character-checker");

// Inclusion tables are ported from AozoraBunko::Checkerkun 0.12, which
// preserves the tables used by the original Character Checker 3.60.
function entries(value: string, kind: InclusionKind) {
  return value
    .trim()
    .split(/\s+/u)
    .map((entry) => {
      const [code, character] = entry.split(":");
      return [code, { character, kind }] as const;
    });
}

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
    "78互換包摂",
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
    "包摂",
  ),
]);

const inclusionNotePattern = /※［＃[^\n］]{0,80}?水準(\d+-\d+-\d+)[^\n］]{0,80}?］/gu;
const controlPattern = /[\u0000-\u0009\u000b\u000c\u000e-\u001f\u007f-\u009f]/u;
const halfwidthKatakanaPattern = /[\uff61-\uff9f]/u;

// CP932 uses these Unicode characters for code points whose JIS X 0208
// mappings use the corresponding characters in `jisMappingExceptions`.
const cp932OnlyVariants = new Set(["～", "∥", "－", "￠", "￡", "￢"]);
const jisMappingExceptions = new Set(["〜", "‖", "−", "¢", "£", "¬"]);

function canEncodeAsJisX0208(character: string) {
  if (jisMappingExceptions.has(character)) return true;
  if (cp932OnlyVariants.has(character)) return false;

  let bytes: number[];
  try {
    bytes = Encoding.convert(Encoding.stringToCode(character), {
      from: "UNICODE",
      to: "SJIS",
      fallback: "error",
    });
  } catch {
    return false;
  }

  if (bytes.length === 1) return bytes[0] <= 0x7f;
  if (bytes.length !== 2) return false;

  const [lead, trail] = bytes;
  if (trail === 0x7f || trail < 0x40 || trail > 0xfc) return false;

  // JIS X 0208 rows 1–94 end at 0xeffc. CP932 additionally assigns the
  // otherwise unused row 13 and vendor-extension ranges from 0xed onward.
  if (lead === 0x87 && trail <= 0x9c) return false;
  return (
    (lead >= 0x81 && lead <= 0x9f) ||
    (lead >= 0xe0 && lead <= 0xea)
  );
}

function issueForCharacter(character: string): string | null {
  const codePoint = character.codePointAt(0) ?? 0;

  if (controlPattern.test(character)) {
    return `制御文字 U+${codePoint.toString(16).toUpperCase().padStart(4, "0")}`;
  }
  if (halfwidthKatakanaPattern.test(character)) return "半角カタカナ";
  if (character === " ") return "半角スペース";
  if (character === "～") return "全角チルダ（波ダッシュ「〜」を確認してください）";
  if (character === "(" || character === ")") return "半角括弧";
  if (!canEncodeAsJisX0208(character)) return "JIS X 0208外の文字";

  return null;
}

export function findCharacterCheckerIssues(text: string): CharacterIssue[] {
  const issues: CharacterIssue[] = [];
  const occupied = new Set<number>();

  for (const match of text.matchAll(inclusionNotePattern)) {
    if (match.index === undefined) continue;
    const inclusion = inclusionByCode.get(match[1]);
    if (!inclusion) continue;

    const to = match.index + match[0].length;
    issues.push({
      from: match.index,
      to,
      message: `${inclusion.kind}の対象です。外字注記は「${inclusion.character}」で入力できます。`,
    });
    for (let index = match.index; index < to; index += 1) occupied.add(index);
  }

  let index = 0;
  for (const character of text) {
    const length = character.length;
    if (!occupied.has(index)) {
      const message = issueForCharacter(character);
      if (message) issues.push({ from: index, to: index + length, message });
    }
    index += length;
  }

  return issues.sort((left, right) => left.from - right.from);
}

const extention = Extension.create({
  name: "aozoraCharacterChecker",

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
              if (!node.isText || !node.text) return;

              for (const issue of findCharacterCheckerIssues(node.text)) {
                decorations.push(
                  Decoration.inline(
                    position + issue.from,
                    position + issue.to,
                    {
                      class: "aozora-character-checker-issue",
                      title: issue.message,
                      "data-character-checker-message": issue.message,
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

export const pluginCharacterChecker: EditorPlugin = {
  name: "文字チェッカー",
  description:
    "JIS外字、半角文字、全角チルダ、不要な外字注記を検出します。",
  key,
  extention,
};
