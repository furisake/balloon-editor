import type { AozoraContributor, AozoraWork } from './types'

function parseCsv(csv: string): string[][] {
  const rows: string[][] = []
  let row: string[] = []
  let field = ''
  let quoted = false

  for (let index = 0; index < csv.length; index++) {
    const character = csv[index]

    if (quoted) {
      if (character === '"' && csv[index + 1] === '"') {
        field += '"'
        index++
      } else if (character === '"') {
        quoted = false
      } else {
        field += character
      }
    } else if (character === '"') {
      quoted = true
    } else if (character === ',') {
      row.push(field)
      field = ''
    } else if (character === '\n') {
      row.push(field.replace(/\r$/, ''))
      rows.push(row)
      row = []
      field = ''
    } else {
      field += character
    }
  }

  if (field || row.length) {
    row.push(field.replace(/\r$/, ''))
    rows.push(row)
  }

  return rows
}

function contributorFrom(row: string[]): AozoraContributor {
  return {
    name: `${row[15]} ${row[16]}`.trim(),
    nameKana: `${row[17]} ${row[18]}`.trim(),
    role: row[23],
  }
}

export function parseAozoraCatalog(csv: string): AozoraWork[] {
  const rows = parseCsv(csv.replace(/^\uFEFF/, ''))
  const works = new Map<string, AozoraWork>()

  for (const row of rows.slice(1)) {
    const id = row[0]
    const textUrl = row[45]
    if (!id || !textUrl) continue

    const contributor = contributorFrom(row)
    const work = works.get(id)

    if (work) {
      if (
        contributor.name &&
        !work.contributors.some(
          (item) =>
            item.name === contributor.name && item.role === contributor.role,
        )
      ) {
        work.contributors.push(contributor)
      }
      continue
    }

    works.set(id, {
      id,
      title: row[1],
      titleKana: row[2],
      subtitle: row[4],
      orthography: row[9],
      publishedAt: row[11],
      cardUrl: row[13],
      inputter: row[43],
      proofreader: row[44],
      textUrl,
      textEncoding: row[47],
      contributors: contributor.name ? [contributor] : [],
    })
  }

  return [...works.values()]
}
