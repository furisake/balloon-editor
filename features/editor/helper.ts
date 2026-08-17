import type { JSONContent } from '@tiptap/react'
import Encoding from 'encoding-japanese'
import { DocumentStatistics, EditorDocument, LocalSaveData } from './type'

export function textToDocument({
  title,
  text: value,
}: {
  title: string
  text: string
}) {
  const lines = value.replace(/\r\n/g, '\n').replace(/\r/g, '\n').split('\n')

  return {
    title,
    type: 'doc',
    content: lines.map((line) => ({
      type: 'paragraph',
      ...(line ? { content: [{ type: 'text', text: line }] } : {}),
    })),
  }
}

function tiptapContentToText(node: JSONContent): string {
  if (node.type === 'text') return node.text ?? ''
  if (node.type === 'hardBreak') return '\n'
  return node.content?.map(tiptapContentToText).join('') ?? ''
}

export function docToText(document: EditorDocument, lineEnding: string) {
  return document.content?.map(tiptapContentToText).join(lineEnding) ?? ''
}

export function countText(value: string) {
  return value.replace(/\r?\n/g, '').length
}

export function buildFileName({
  document,
}: {
  document: EditorDocument
}): string {
  const baseName = document.title.trim()
  return `${baseName}.txt`
}

export function encodeShiftJis(value: string): Uint8Array<ArrayBuffer> {
  const unicode = Encoding.stringToCode(value)
  const shiftJis = Encoding.convert(unicode, {
    from: 'UNICODE',
    to: 'SJIS',
    fallback: 'error',
  })

  const bytes = new Uint8Array(shiftJis.length)
  bytes.set(shiftJis)
  return bytes
}

export function buildStatistics({
  document,
}: {
  document: EditorDocument
}): DocumentStatistics {
  const text = docToText(document, '\n')
  const characterCount = countText(text)
  const lineCount = text.split('\n').length

  return { characterCount, lineCount }
}

export function buildLocalSaveData({
  document,
}: {
  document: EditorDocument
}): LocalSaveData {
  const text = docToText(document, '\n')
  return {
    title: document.title,
    text,
    savedAt: new Date().toISOString(),
  }
}

export async function readFile(file: File): Promise<EditorDocument> {
  const title = file.name.replace(/\.txt$/i, '')
  const bytes = new Uint8Array(await file.arrayBuffer())

  try {
    const text = new TextDecoder('utf-8', { fatal: true })
      .decode(bytes)
      .replace(/^\uFEFF/, '')
    return textToDocument({ text, title })
  } catch {
    const text = new TextDecoder('shift_jis', { fatal: true }).decode(bytes)
    return textToDocument({ text, title })
  }
}
