/**
 * A tiny, safe Markdown subset for assistant replies: paragraphs, "- " bullets,
 * "1. " numbered items, **bold** and _italic_ / *italic*. It returns plain data
 * (never HTML strings), so the widget renders it as React nodes with no
 * dangerouslySetInnerHTML. Pure and SDK-free so Vitest can cover it.
 */

export type InlineSegment = { text: string; bold?: boolean; italic?: boolean };

export type ChatBlock =
  | { kind: "paragraph"; segments: InlineSegment[] }
  | { kind: "bullets"; items: InlineSegment[][] }
  | { kind: "numbered"; items: InlineSegment[][] };

const INLINE = /(\*\*[^*]+\*\*|_[^_]+_|\*[^*\s][^*]*\*)/g;

export function parseInline(text: string): InlineSegment[] {
  const segments: InlineSegment[] = [];
  let last = 0;
  for (const match of text.matchAll(INLINE)) {
    const index = match.index ?? 0;
    if (index > last) segments.push({ text: text.slice(last, index) });
    const token = match[0];
    if (token.startsWith("**")) segments.push({ text: token.slice(2, -2), bold: true });
    else segments.push({ text: token.slice(1, -1), italic: true });
    last = index + token.length;
  }
  if (last < text.length) segments.push({ text: text.slice(last) });
  return segments;
}

export function parseChatMarkdown(source: string): ChatBlock[] {
  const blocks: ChatBlock[] = [];
  for (const raw of source.split("\n")) {
    const line = raw.trimEnd();
    if (!line.trim()) continue;

    const bullet = /^\s*[-*•]\s+(.*)$/.exec(line);
    const numbered = /^\s*\d+[.)]\s+(.*)$/.exec(line);
    const previous = blocks[blocks.length - 1];

    if (bullet) {
      if (previous?.kind === "bullets") previous.items.push(parseInline(bullet[1]));
      else blocks.push({ kind: "bullets", items: [parseInline(bullet[1])] });
    } else if (numbered) {
      if (previous?.kind === "numbered") previous.items.push(parseInline(numbered[1]));
      else blocks.push({ kind: "numbered", items: [parseInline(numbered[1])] });
    } else {
      blocks.push({ kind: "paragraph", segments: parseInline(line.replace(/^#+\s*/, "")) });
    }
  }
  return blocks;
}
