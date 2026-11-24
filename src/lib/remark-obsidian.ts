/**
 * remark plugin: Obsidian-flavoured markdown for blog posts.
 *
 *  - Callouts:   > [!tip] Optional title      (also [!type]+ / [!type]- foldable markers)
 *                > body…
 *    → <div class="callout" data-callout="tip"><p class="callout-title">…</p>…</div>
 *  - Highlights: ==text==  → <mark>text</mark>
 *
 * Written against the mdast tree directly so no extra dependencies are needed.
 */

// Minimal mdast shapes — enough for this transform.
interface MdNode {
  type: string;
  value?: string;
  children?: MdNode[];
  data?: { hName?: string; hProperties?: Record<string, unknown> };
}

const CALLOUT_RE = /^\[!([A-Za-z][\w-]*)\]([+-]?)[ \t]*([^\n]*)(?:\n|$)/;

// Obsidian aliases → the canonical type used for styling.
const CALLOUT_ALIASES: Record<string, string> = {
  summary: "abstract", tldr: "abstract",
  hint: "tip", important: "tip",
  check: "success", done: "success",
  help: "question", faq: "question",
  caution: "warning", attention: "warning",
  fail: "failure", missing: "failure",
  error: "danger",
  cite: "quote",
};

const KNOWN_CALLOUTS = new Set([
  "note", "abstract", "info", "todo", "tip", "success", "question",
  "warning", "failure", "danger", "bug", "example", "quote",
]);

function titleCase(type: string): string {
  return type.charAt(0).toUpperCase() + type.slice(1);
}

function transformCallout(node: MdNode): void {
  const firstPara = node.children?.[0];
  if (!firstPara || firstPara.type !== "paragraph" || !firstPara.children?.length) return;
  const firstText = firstPara.children[0];
  if (firstText.type !== "text" || !firstText.value) return;

  const match = CALLOUT_RE.exec(firstText.value);
  if (!match) return;

  const rawType = match[1].toLowerCase();
  const aliased = CALLOUT_ALIASES[rawType] ?? rawType;
  const type = KNOWN_CALLOUTS.has(aliased) ? aliased : "note";
  const titleText = match[3].trim();
  const markerEndedLine = match[0].endsWith("\n");

  // Strip the marker from the first text node.
  firstText.value = firstText.value.slice(match[0].length);

  // Title: rest of the marker line. If the title line continues with inline
  // formatting (e.g. `[!tip] Use **this**`), keep those nodes in the title.
  const titleChildren: MdNode[] = [];
  if (titleText) titleChildren.push({ type: "text", value: titleText });
  if (!markerEndedLine) {
    // The whole first paragraph is a single line, so all of it belongs to the title.
    if (firstText.value) titleChildren.push({ type: "text", value: firstText.value });
    titleChildren.push(...firstPara.children.slice(1));
    firstPara.children = [];
  } else if (!firstText.value) {
    firstPara.children.shift();
  }
  if (titleChildren.length === 0) titleChildren.push({ type: "text", value: titleCase(rawType) });

  const title: MdNode = {
    type: "paragraph",
    children: titleChildren,
    data: { hName: "p", hProperties: { className: ["callout-title"] } },
  };

  const body = (node.children ?? []).filter(
    (child, i) => !(i === 0 && child.type === "paragraph" && !child.children?.length)
  );
  node.children = [title, ...body];
  node.data = {
    hName: "div",
    hProperties: { className: ["callout"], "data-callout": type },
  };
}

const HIGHLIGHT_RE = /==(?=\S)([^=\n]*?\S)==/g;

function splitHighlights(children: MdNode[]): MdNode[] {
  const out: MdNode[] = [];
  for (const child of children) {
    if (child.type !== "text" || !child.value?.includes("==")) {
      out.push(child);
      continue;
    }
    let last = 0;
    const value = child.value;
    for (const m of value.matchAll(HIGHLIGHT_RE)) {
      const start = m.index ?? 0;
      if (start > last) out.push({ type: "text", value: value.slice(last, start) });
      out.push({
        type: "emphasis", // any phrasing container; hName decides the element
        children: [{ type: "text", value: m[1] }],
        data: { hName: "mark" },
      });
      last = start + m[0].length;
    }
    if (last < value.length) out.push({ type: "text", value: value.slice(last) });
  }
  return wrapSpanningHighlights(out);
}

const mark = (children: MdNode[]): MdNode => ({ type: "emphasis", children, data: { hName: "mark" } });

/**
 * ==text **with bold** or [links]== : the markers sit in two different text
 * nodes with other inline nodes between them, so the per-node regex above
 * misses it. Pair a leftover opening "==" with the next closing "==" among
 * the siblings and wrap everything in between.
 */
function wrapSpanningHighlights(nodes: MdNode[]): MdNode[] {
  const out = [...nodes];
  for (let i = 0; i < out.length; i++) {
    const open = out[i];
    if (open.type !== "text" || !open.value) continue;
    const o = open.value.lastIndexOf("==");
    if (o < 0) continue;
    // "==" must be followed by content: a non-space here, or the next inline node
    const next = open.value[o + 2];
    if (next !== undefined && /\s/.test(next)) continue;
    for (let j = i + 1; j < out.length; j++) {
      const close = out[j];
      if (close.type !== "text" || !close.value?.includes("==")) continue;
      const c = close.value.indexOf("==");
      if (c === 0 ? false : /\s/.test(close.value[c - 1])) break;
      const before = open.value.slice(0, o);
      const firstPart = open.value.slice(o + 2);
      const lastPart = close.value.slice(0, c);
      const after = close.value.slice(c + 2);
      const inner: MdNode[] = [
        ...(firstPart ? [{ type: "text", value: firstPart }] : []),
        ...out.slice(i + 1, j),
        ...(lastPart ? [{ type: "text", value: lastPart }] : []),
      ];
      const replacement: MdNode[] = [
        ...(before ? [{ type: "text", value: before }] : []),
        mark(inner),
        ...(after ? [{ type: "text", value: after }] : []),
      ];
      out.splice(i, j - i + 1, ...replacement);
      break;
    }
  }
  return out;
}

function walk(node: MdNode): void {
  if (node.type === "blockquote") transformCallout(node);
  if (!node.children) return;
  node.children = splitHighlights(node.children);
  for (const child of node.children) walk(child);
}

export default function remarkObsidian() {
  return (tree: MdNode) => walk(tree);
}
