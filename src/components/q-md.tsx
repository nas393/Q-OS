import { Fragment, type ReactNode } from "react";

/* Safe, dependency-free Markdown subset for Q replies. */
function decodeEntities(value: string): string {
  return value.replace(/&(#x[0-9a-f]+|#\d+|nbsp|amp|lt|gt|quot|apos);/gi, (entity, code: string) => {
    if (code[0] === "#") {
      const hex = code[1]?.toLowerCase() === "x";
      const point = Number.parseInt(code.slice(hex ? 2 : 1), hex ? 16 : 10);
      return Number.isFinite(point) && point >= 0 && point <= 0x10ffff ? String.fromCodePoint(point) : entity;
    }
    return ({ nbsp: "\u00a0", amp: "&", lt: "<", gt: ">", quot: '"', apos: "'" } as Record<string, string>)[code.toLowerCase()] ?? entity;
  });
}

function inline(value: string): ReactNode[] {
  const text = decodeEntities(value);
  return text.split(/(\*\*[^*]+\*\*|\*[^*]+\*|\x60[^\x60]+\x60)/g).map((part, index) => {
    if (part.startsWith("**") && part.endsWith("**")) return <strong key={index}>{part.slice(2, -2)}</strong>;
    if (part.startsWith("*") && part.endsWith("*")) return <em key={index}>{part.slice(1, -1)}</em>;
    if (part.startsWith("`") && part.endsWith("`")) return <code key={index}>{part.slice(1, -1)}</code>;
    return <Fragment key={index}>{part}</Fragment>;
  });
}

export default function QMd({ text }: { text: string }) {
  const lines = text.replace(/\r\n?/g, "\n").split("\n");
  const blocks: ReactNode[] = [];
  let list: { ordered: boolean; items: string[] } | null = null;

  const flushList = () => {
    if (!list) return;
    const Tag = list.ordered ? "ol" : "ul";
    blocks.push(<Tag key={blocks.length}>{list.items.map((item, index) => <li key={index}>{inline(item)}</li>)}</Tag>);
    list = null;
  };

  lines.forEach((raw, index) => {
    const line = raw.trim();
    if (!line) { flushList(); return; }
    const bullet = line.match(/^[-•*]\s+(.+)$/);
    const numbered = line.match(/^\d+[.)]\s+(.+)$/);
    if (bullet || numbered) {
      const ordered = Boolean(numbered);
      if (list && list.ordered !== ordered) flushList();
      if (!list) list = { ordered, items: [] };
      list.items.push((bullet ?? numbered)![1]);
      return;
    }
    flushList();
    const heading = line.match(/^(#{1,4})\s+(.+)$/);
    if (heading) {
      const level = heading[1].length;
      const Tag = (level === 1 ? "h3" : level === 2 ? "h4" : "h5") as "h3" | "h4" | "h5";
      blocks.push(<Tag key={index} className="qmd-h">{inline(heading[2])}</Tag>);
      return;
    }
    blocks.push(<p key={index}>{inline(line)}</p>);
  });
  flushList();
  return <>{blocks}</>;
}
