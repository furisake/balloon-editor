import { readFileSync, writeFileSync } from 'node:fs'

const [inputPath, outputPath] = process.argv.slice(2)
if (!inputPath || !outputPath) {
  throw new Error(
    'Usage: node scripts/generate-gaiji-note-dictionary.mjs <extracted-dictionary.txt> <output.ts>',
  )
}

const source = readFileSync(inputPath, 'utf8')
const jisCodes = new Set()
const unicodeCodes = new Set()

for (const match of source.matchAll(/\b([12])-(\d{1,2})-(\d{1,2})\b/gu)) {
  const plane = Number(match[1])
  const row = Number(match[2])
  const cell = Number(match[3])
  if (row >= 1 && row <= 94 && cell >= 1 && cell <= 94) {
    jisCodes.add(plane * 10_000 + row * 100 + cell)
  }
}

for (const match of source.matchAll(/\bU\+([0-9A-F]{4,6})\b/gu)) {
  const codePoint = Number.parseInt(match[1], 16)
  if (codePoint <= 0x10ffff) unicodeCodes.add(codePoint)
}

const numericSort = (left, right) => left - right
const format = (values, formatter = String) => {
  const lines = []
  const sorted = [...values].sort(numericSort)
  for (let index = 0; index < sorted.length; index += 16) {
    lines.push(
      `  ${sorted
        .slice(index, index + 16)
        .map(formatter)
        .join(', ')},`,
    )
  }
  return lines.join('\n')
}

const output = `// Generated from 青空文庫・外字注記辞書 第八版訂正版.
// Source: https://www.aozora.gr.jp/gaiji_chuki/
// Regenerate with scripts/generate-gaiji-note-dictionary.mjs after extracting
// the official PDF as UTF-8 text.

export const gaijiDictionaryJisCodes = new Set<number>([
${format(jisCodes)}
]);

export const gaijiDictionaryUnicodeCodes = new Set<number>([
${format(unicodeCodes, (value) => `0x${value.toString(16)}`)}
]);
`

writeFileSync(outputPath, output)
console.log(
  `Generated ${jisCodes.size} JIS codes and ${unicodeCodes.size} Unicode codes.`,
)
