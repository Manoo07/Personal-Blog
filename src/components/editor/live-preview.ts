/**
 * Obsidian-style "Live Preview" for CodeMirror 6.
 *
 * Markdown syntax (#, **, `, [](), > [!type], - [ ], ---, images) is hidden and
 * rendered in place on every line except the ones holding the cursor, where the
 * raw source comes back so it can be edited — the same behaviour as Obsidian.
 */
import { syntaxTree } from "@codemirror/language";
import type { EditorState, Range } from "@codemirror/state";
import { Decoration, type DecorationSet, EditorView, ViewPlugin, type ViewUpdate, WidgetType } from "@codemirror/view";
import { Tag, tags as t } from "@lezer/highlight";
import type { MarkdownConfig } from "@lezer/markdown";

/* ── ==highlight== syntax (not part of CommonMark/GFM) ───────────────────── */

export const highlightTag = Tag.define();
const HighlightDelim = { resolve: "Highlight", mark: "HighlightMark" };

export const HighlightSyntax: MarkdownConfig = {
  defineNodes: [
    { name: "Highlight", style: highlightTag },
    { name: "HighlightMark", style: t.processingInstruction },
  ],
  parseInline: [
    {
      name: "Highlight",
      parse(cx, next, pos) {
        // "==" but not "===" (and not an "a == b" comparison: needs no space on the inner side)
        if (next !== 61 || cx.char(pos + 1) !== 61 || cx.char(pos + 2) === 61) return -1;
        const before = cx.slice(pos - 1, pos);
        const after = cx.slice(pos + 2, pos + 3);
        const spaceBefore = /^$|\s/.test(before);
        const spaceAfter = /^$|\s/.test(after);
        return cx.addDelimiter(HighlightDelim, pos, pos + 2, !spaceAfter, !spaceBefore);
      },
      after: "Emphasis",
    },
  ],
};

/* ── widgets ──────────────────────────────────────────────────────────────── */

class BulletWidget extends WidgetType {
  eq() { return true; }
  toDOM() {
    const s = document.createElement("span");
    s.className = "cm-lp-bullet";
    s.textContent = "•";
    return s;
  }
}

class CheckboxWidget extends WidgetType {
  constructor(readonly checked: boolean) { super(); }
  eq(o: CheckboxWidget) { return o.checked === this.checked; }
  toDOM() {
    const i = document.createElement("input");
    i.type = "checkbox";
    i.checked = this.checked;
    i.className = "cm-lp-checkbox";
    i.setAttribute("aria-label", this.checked ? "Completed task" : "Open task");
    return i;
  }
  ignoreEvent() { return false; }
}

class ImageWidget extends WidgetType {
  constructor(readonly src: string, readonly alt: string) { super(); }
  eq(o: ImageWidget) { return o.src === this.src && o.alt === this.alt; }
  toDOM() {
    const wrap = document.createElement("span");
    wrap.className = "cm-lp-image";
    if (this.src.startsWith("uploading-")) {
      wrap.classList.add("cm-lp-image-pending");
      wrap.textContent = this.alt || "Uploading…";
      return wrap;
    }
    const img = document.createElement("img");
    img.src = this.src;
    img.alt = this.alt;
    img.loading = "lazy";
    wrap.appendChild(img);
    return wrap;
  }
}

class RuleWidget extends WidgetType {
  eq() { return true; }
  toDOM() {
    const s = document.createElement("span");
    s.className = "cm-lp-hr";
    return s;
  }
}

class TextWidget extends WidgetType {
  constructor(readonly text: string, readonly cls: string) { super(); }
  eq(o: TextWidget) { return o.text === this.text && o.cls === this.cls; }
  toDOM() {
    const s = document.createElement("span");
    s.className = this.cls;
    s.textContent = this.text;
    return s;
  }
}

/* ── callouts ─────────────────────────────────────────────────────────────── */

const CALLOUT_COLOR: Record<string, string> = {
  note: "note",
  abstract: "info", summary: "info", tldr: "info", info: "info", todo: "info",
  tip: "tip", hint: "tip", important: "tip",
  success: "success", check: "success", done: "success",
  question: "question", help: "question", faq: "question",
  warning: "warning", caution: "warning", attention: "warning",
  failure: "danger", fail: "danger", missing: "danger", danger: "danger", error: "danger", bug: "danger",
  example: "example",
  quote: "quote", cite: "quote",
};
export const CALLOUT_TYPES = ["note", "info", "tip", "success", "question", "warning", "danger", "bug", "example", "quote", "abstract", "todo", "failure"];
const CALLOUT_RE = /^(\s*>\s*)\[!([\w-]+)\][-+]?[ \t]?(.*)$/;

/* ── decoration builder ───────────────────────────────────────────────────── */

function activeLineNumbers(state: EditorState, focused: boolean): Set<number> {
  const lines = new Set<number>();
  if (!focused) return lines;
  for (const r of state.selection.ranges) {
    const a = state.doc.lineAt(r.from).number;
    const b = state.doc.lineAt(r.to).number;
    for (let n = a; n <= b; n++) lines.add(n);
  }
  return lines;
}

function buildDecorations(view: EditorView): DecorationSet {
  const { state } = view;
  const doc = state.doc;
  const deco: Range<Decoration>[] = [];
  const active = activeLineNumbers(state, view.hasFocus);

  const touchesActive = (from: number, to: number) => {
    const a = doc.lineAt(from).number;
    const b = doc.lineAt(to).number;
    for (let n = a; n <= b; n++) if (active.has(n)) return true;
    return false;
  };
  const hide = (from: number, to: number) => {
    if (to > from) deco.push(Decoration.replace({}).range(from, to));
  };
  const widget = (from: number, to: number, w: WidgetType) => {
    deco.push(Decoration.replace({ widget: w }).range(from, to));
  };
  const lineClass = (lineFrom: number, cls: string) => {
    deco.push(Decoration.line({ class: cls }).range(lineFrom));
  };
  const eachLine = (from: number, to: number, fn: (lineFrom: number, i: number, last: boolean) => void) => {
    const first = doc.lineAt(from).number;
    const last = doc.lineAt(to).number;
    for (let n = first; n <= last; n++) fn(doc.line(n).from, n - first, n === last);
  };
  const spaceAfter = (pos: number) => (doc.sliceString(pos, pos + 1) === " " ? 1 : 0);

  for (const { from, to } of view.visibleRanges) {
    syntaxTree(state).iterate({
      from,
      to,
      enter: (node) => {
        const name = node.name;
        const live = !touchesActive(node.from, node.to);

        const heading = /^ATXHeading(\d)$/.exec(name);
        if (heading) {
          lineClass(doc.lineAt(node.from).from, `cm-lp-h cm-lp-h${heading[1]}`);
          return;
        }

        switch (name) {
          case "HeaderMark": {
            if (!live) return;
            const atLineStart = doc.lineAt(node.from).from === node.from;
            hide(node.from, node.to + (atLineStart ? spaceAfter(node.to) : 0));
            return;
          }

          case "EmphasisMark":
          case "StrikethroughMark":
          case "HighlightMark":
            if (live) hide(node.from, node.to);
            return;

          case "CodeMark":
            if (live && node.node.parent?.name === "InlineCode") hide(node.from, node.to);
            return;

          case "FencedCode":
          case "CodeBlock": {
            eachLine(node.from, node.to, (lf, i, last) =>
              lineClass(lf, `cm-lp-code${i === 0 ? " cm-lp-code-start" : ""}${last ? " cm-lp-code-end" : ""}`)
            );
            // Like Obsidian: outside the block, the ``` fences give way to a small language label
            if (name === "FencedCode" && live) {
              const first = doc.lineAt(node.from);
              const last = doc.lineAt(node.to);
              const info = node.node.getChild("CodeInfo");
              const lang = info ? doc.sliceString(info.from, info.to).trim() : "";
              widget(first.from, first.to, new TextWidget(lang, "cm-lp-code-lang"));
              if (last.number > first.number && /^\s*(`{3,}|~{3,})\s*$/.test(last.text)) hide(last.from, last.to);
            }
            return false;
          }

          case "Table":
            eachLine(node.from, node.to, (lf) => lineClass(lf, "cm-lp-table"));
            return;

          case "HorizontalRule":
            if (live) widget(node.from, node.to, new RuleWidget());
            return;

          case "Image": {
            const url = node.node.getChild("URL");
            if (!live || !url) return false;
            const src = doc.sliceString(url.from, url.to);
            const close = doc.sliceString(node.from, url.from).lastIndexOf("](");
            const alt = close > 2 ? doc.sliceString(node.from + 2, node.from + close) : "";
            widget(node.from, node.to, new ImageWidget(src, alt));
            return false;
          }

          case "Link": {
            const url = node.node.getChild("URL");
            const marks = node.node.getChildren("LinkMark");
            if (!url || marks.length < 2) return;
            const href = doc.sliceString(url.from, url.to);
            const textFrom = marks[0].to;
            const textTo = marks[1].from;
            if (textTo > textFrom) {
              deco.push(
                Decoration.mark({ class: "cm-lp-link", attributes: { "data-href": href, title: `${href}\n⌘/Ctrl-click to open` } })
                  .range(textFrom, textTo)
              );
            }
            if (live) {
              hide(marks[0].from, marks[0].to);
              hide(marks[1].from, node.to);
            }
            return;
          }

          case "Blockquote": {
            const firstLine = doc.lineAt(node.from);
            const callout = CALLOUT_RE.exec(firstLine.text);
            if (!callout) {
              eachLine(node.from, node.to, (lf) => lineClass(lf, "cm-lp-quote"));
              return;
            }
            const type = callout[2].toLowerCase();
            const color = CALLOUT_COLOR[type] ?? "note";
            eachLine(node.from, node.to, (lf, i, last) =>
              lineClass(
                lf,
                `cm-lp-callout cm-lp-callout-${color}${i === 0 ? " cm-lp-callout-title" : ""}${last ? " cm-lp-callout-end" : ""}`
              )
            );
            if (!touchesActive(firstLine.from, firstLine.to)) {
              const markFrom = firstLine.from + callout[1].length;
              const markTo = firstLine.to - callout[3].length;
              if (callout[3].trim()) hide(markFrom, markTo);
              else widget(markFrom, markTo, new TextWidget(type[0].toUpperCase() + type.slice(1), "cm-lp-callout-name"));
            }
            return;
          }

          case "QuoteMark":
            if (live) hide(node.from, node.to + spaceAfter(node.to));
            return;

          case "ListMark": {
            if (!live) return;
            const item = node.node.parent;
            if (item?.getChild("Task")) {
              hide(node.from, node.to + spaceAfter(node.to));
            } else if (item?.parent?.name === "BulletList") {
              widget(node.from, node.to, new BulletWidget());
            }
            return;
          }

          case "TaskMarker": {
            if (!live) return;
            const checked = /x/i.test(doc.sliceString(node.from, node.to));
            widget(node.from, node.to, new CheckboxWidget(checked));
            if (checked) {
              const line = doc.lineAt(node.from);
              if (line.to > node.to) deco.push(Decoration.mark({ class: "cm-lp-task-done" }).range(node.to, line.to));
            }
            return;
          }
        }
      },
    });
  }
  return Decoration.set(deco, true);
}

export const livePreview = ViewPlugin.fromClass(
  class {
    decorations: DecorationSet;
    constructor(view: EditorView) {
      this.decorations = buildDecorations(view);
    }
    update(u: ViewUpdate) {
      if (u.docChanged || u.viewportChanged || u.selectionSet || u.focusChanged || syntaxTree(u.startState) !== syntaxTree(u.state)) {
        this.decorations = buildDecorations(u.view);
      }
    }
  },
  {
    decorations: (v) => v.decorations,
    eventHandlers: {
      mousedown(e, view) {
        const target = e.target as HTMLElement;
        // Click a checkbox: toggle "[ ]" <-> "[x]"
        if (target instanceof HTMLInputElement && target.classList.contains("cm-lp-checkbox")) {
          const pos = view.posAtDOM(target);
          const text = view.state.doc.sliceString(pos, pos + 3);
          if (/^\[[ xX]\]$/.test(text)) {
            view.dispatch({ changes: { from: pos + 1, to: pos + 2, insert: text[1] === " " ? "x" : " " } });
            e.preventDefault();
            return true;
          }
        }
        // ⌘/Ctrl-click a link: open it, like Obsidian
        const link = target.closest<HTMLElement>(".cm-lp-link");
        if (link && (e.metaKey || e.ctrlKey)) {
          const href = link.dataset.href;
          if (href) window.open(href, "_blank", "noopener");
          e.preventDefault();
          return true;
        }
        return false;
      },
    },
  }
);
