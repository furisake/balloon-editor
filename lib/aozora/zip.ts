import 'server-only'

import { inflateRawSync } from 'node:zlib'

const LOCAL_FILE_HEADER = 0x04034b50
const CENTRAL_FILE_HEADER = 0x02014b50
const END_OF_CENTRAL_DIRECTORY = 0x06054b50

function findEndOfCentralDirectory(view: DataView): number {
  const minimumOffset = Math.max(0, view.byteLength - 65_557)

  for (let offset = view.byteLength - 22; offset >= minimumOffset; offset--) {
    if (view.getUint32(offset, true) === END_OF_CENTRAL_DIRECTORY) {
      return offset
    }
  }

  throw new Error('ZIPの中央ディレクトリが見つかりませんでした。')
}

/** 青空文庫が配布する単一ファイルZIPから内容を取り出す。 */
export function extractFirstFile(archive: ArrayBuffer): Uint8Array {
  const bytes = new Uint8Array(archive)
  const view = new DataView(archive)
  const endOffset = findEndOfCentralDirectory(view)
  const entryCount = view.getUint16(endOffset + 10, true)
  let centralOffset = view.getUint32(endOffset + 16, true)

  for (let index = 0; index < entryCount; index++) {
    if (view.getUint32(centralOffset, true) !== CENTRAL_FILE_HEADER) {
      throw new Error('ZIPのファイル情報を読み取れませんでした。')
    }

    const compression = view.getUint16(centralOffset + 10, true)
    const compressedSize = view.getUint32(centralOffset + 20, true)
    const fileNameLength = view.getUint16(centralOffset + 28, true)
    const extraLength = view.getUint16(centralOffset + 30, true)
    const commentLength = view.getUint16(centralOffset + 32, true)
    const localOffset = view.getUint32(centralOffset + 42, true)
    const fileName = new TextDecoder().decode(
      bytes.subarray(centralOffset + 46, centralOffset + 46 + fileNameLength),
    )

    if (!fileName.endsWith('/')) {
      if (view.getUint32(localOffset, true) !== LOCAL_FILE_HEADER) {
        throw new Error('ZIPのローカルヘッダーを読み取れませんでした。')
      }

      const localNameLength = view.getUint16(localOffset + 26, true)
      const localExtraLength = view.getUint16(localOffset + 28, true)
      const dataOffset = localOffset + 30 + localNameLength + localExtraLength
      const compressed = bytes.subarray(dataOffset, dataOffset + compressedSize)

      if (compression === 0) return compressed.slice()
      if (compression === 8) return inflateRawSync(compressed)

      throw new Error(`未対応のZIP圧縮方式です (${compression})。`)
    }

    centralOffset += 46 + fileNameLength + extraLength + commentLength
  }

  throw new Error('ZIPにファイルが含まれていませんでした。')
}
