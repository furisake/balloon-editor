import { ReactNode } from "react";
import { cn } from "@/lib/utils";
import {
  AOZORA_MARKER_PAGE_BREAK,
  AOZORA_PATTERN_HEADING_PATTERN,
} from "@/constants/aozora";

function renderInline(line: string): ReactNode[] {
  const pattern =
    /｜([^《\n]+)《([^》\n]+)》|([仝々〆〇ヶ\u3400-\u9fff\uf900-\ufaff]+|[ぁ-ゖゝゞ]+|[ァ-ヺヽヾー]+|[A-Za-zＡ-Ｚａ-ｚ]+)《([^》\n]+)》|［＃([^］\n]+)］/gu;
  const nodes: ReactNode[] = [];
  let cursor = 0;
  let match: RegExpExecArray | null;

  while ((match = pattern.exec(line))) {
    if (match.index > cursor) nodes.push(line.slice(cursor, match.index));

    const base = match[1] ?? match[3];
    const reading = match[2] ?? match[4];
    const note = match[5];

    if (base && reading) {
      nodes.push(
        <ruby key={`${match.index}-${base}`}>
          {base}
          <rp>（</rp>
          <rt>{reading}</rt>
          <rp>）</rp>
        </ruby>,
      );
    } else if (note) {
      nodes.push(
        <span className="aozora-preview-note" key={`${match.index}-${note}`}>
          ［＃{note}］
        </span>,
      );
    }

    cursor = pattern.lastIndex;
  }

  if (cursor < line.length) nodes.push(line.slice(cursor));
  return nodes;
}

export function Preview({
  text,
  vertical,
}: {
  text: string;
  vertical: boolean;
}) {
  return (
    <article
      className={cn(
        "editor-paper preview mx-auto border bg-background shadow-sm",
        vertical ? "vertical" : "horizontal",
      )}
    >
      <div className="aozora-preview-text" lang="ja">
        {text
          .replace(/\r\n/g, "\n")
          .split("\n")
          .map((line, index) => {
            if (line.trim() === AOZORA_MARKER_PAGE_BREAK) {
              return (
                <div className="aozora-page-break" key={index}>
                  <span>改ページ</span>
                </div>
              );
            }

            const heading = line.match(AOZORA_PATTERN_HEADING_PATTERN);
            const previewLine = heading ? line.replace(heading[0], "") : line;
            const headingClass = heading
              ? `aozora-heading aozora-heading-${heading[1]}`
              : "";

            return (
              <div
                className={`aozora-preview-line ${headingClass}`}
                key={index}
              >
                {previewLine ? renderInline(previewLine) : <br />}
              </div>
            );
          })}
      </div>
    </article>
  );
}
