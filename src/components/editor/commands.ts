/** Formatting commands with Obsidian's behaviour and default shortcuts. */
import { EditorSelection, type EditorState } from "@codemirror/state";
import type { EditorView, KeyBinding } from "@codemirror/view";
import { indentLess } from "@codemirror/commands";

type Cmd = (view: EditorView) => boolean;

/** Wrap / unwrap each selection with a marker (** for bold, * italic, ~~, ==, `). */
export const toggleWrap =
  (marker: string): Cmd =>
  (view) => {
    const len = marker.length;
    view.dispatch(
      view.state.changeByRange((range) => {
        const { from, to } = range;
        const doc = view.state.doc;
        const outer = doc.sliceString(from - len, from) === marker && doc.sliceString(to, to + len) === marker;
        if (outer) {
          return {
            changes: [{ from: from - len, to: from }, { from: to, to: to + len }],
            range: EditorSelection.range(from - len, to - len),
          };
        }
        const text = doc.sliceString(from, to);
        if (text.length >= 2 * len && text.startsWith(marker) && text.endsWith(marker)) {
          return {
            changes: { from, to, insert: text.slice(len, -len) },
            range: EditorSelection.range(from, to - 2 * len),
          };
        }
        return {
          changes: [{ from, insert: marker }, { from: to, insert: marker }],
          range: EditorSelection.range(from + len, to + len),
        };
      })
    );
    view.focus();
    return true;
  };

/** Lines touched by the selection. */
function selectedLines(state: EditorState) {
  const seen = new Set<number>();
  const lines = [];
  for (const r of state.selection.ranges) {
    for (let n = state.doc.lineAt(r.from).number; n <= state.doc.lineAt(r.to).number; n++) {
      if (!seen.has(n)) {
        seen.add(n);
        lines.push(state.doc.line(n));
      }
    }
  }
  return lines;
}

/** Rewrite the start of every selected line. `edit` gets the line text and returns [removeLen, insert]. */
function editLineStarts(view: EditorView, edit: (text: string) => [number, string]) {
  const lines = selectedLines(view.state);
  const changes = view.state.changes(
    lines.map((l) => {
      const [remove, insert] = edit(l.text);
      return { from: l.from, to: l.from + remove, insert };
    })
  );
  // assoc 1: a cursor sitting where the prefix goes ends up after it, ready to type
  view.dispatch({ changes, selection: view.state.selection.map(changes, 1), scrollIntoView: true });
  view.focus();
  return true;
}

const HEADING = /^#{1,6}\s+/;
export const setHeading =
  (level: number): Cmd =>
  (view) =>
    editLineStarts(view, (text) => {
      const cur = HEADING.exec(text);
      const curLevel = cur ? cur[0].trim().length : 0;
      return [cur ? cur[0].length : 0, curLevel === level ? "" : `${"#".repeat(level)} `];
    });

/** Toggle a line prefix such as "- ", "1. ", "> ". */
export const toggleLinePrefix =
  (prefix: string, match: RegExp): Cmd =>
  (view) => {
    const touched = selectedLines(view.state);
    const lines = touched.length === 1 ? touched : touched.filter((l) => l.text.trim());
    const all = lines.every((l) => match.test(l.text));
    const changes = view.state.changes(
      lines.map((l, i) => {
        const m = match.exec(l.text);
        if (all) return { from: l.from, to: l.from + (m ? m[0].length : 0), insert: "" };
        const p = prefix === "1. " ? `${i + 1}. ` : prefix;
        return { from: l.from, insert: p };
      })
    );
    view.dispatch({ changes, selection: view.state.selection.map(changes, 1) });
    view.focus();
    return true;
  };

/** Obsidian's Mod-L: plain -> "- [ ] " -> "- [x] " -> "- [ ] " ... */
export const toggleTask: Cmd = (view) =>
  editLineStarts(view, (text) => {
    const task = /^(\s*)([-*+]) \[( |x|X)\] /.exec(text);
    if (task) return [task[0].length, `${task[1]}${task[2]} [${task[3] === " " ? "x" : " "}] `];
    const bullet = /^(\s*)([-*+]) /.exec(text);
    if (bullet) return [bullet[0].length, `${bullet[1]}${bullet[2]} [ ] `];
    const indent = /^\s*/.exec(text)![0];
    return [indent.length, `${indent}- [ ] `];
  });

/** Mod-K: wrap the selection as a link, or insert an empty one. Pasting a URL over a selection does the same. */
export const insertLink: Cmd = (view) => {
  view.dispatch(
    view.state.changeByRange((range) => {
      const text = view.state.sliceDoc(range.from, range.to);
      if (/^https?:\/\/\S+$/.test(text)) {
        return { changes: { from: range.from, to: range.to, insert: `[](${text})` }, range: EditorSelection.cursor(range.from + 1) };
      }
      const insert = `[${text}]()`;
      const cursor = text ? range.from + text.length + 3 : range.from + 1;
      return { changes: { from: range.from, to: range.to, insert }, range: EditorSelection.cursor(cursor) };
    })
  );
  view.focus();
  return true;
};

/** Insert a block (callout, code block, table, divider) on its own lines at the cursor. */
export const insertBlock =
  (block: string, cursorOffset?: number): Cmd =>
  (view) => {
    const { state } = view;
    const pos = state.selection.main.head;
    const line = state.doc.lineAt(pos);
    const prevHasText = line.number > 1 && state.doc.line(line.number - 1).text.trim() !== "";
    // On a line with text: start the block after a blank line. On an empty line: use it, keeping one blank line above.
    const before = line.text.trim() ? "\n\n" : prevHasText ? "\n" : "";
    const at = line.text.trim() ? line.to : line.from;
    const insert = `${before}${block}\n`;
    const offset = cursorOffset ?? block.length;
    view.dispatch({
      changes: { from: at, to: line.text.trim() ? at : line.to, insert },
      selection: EditorSelection.cursor(at + before.length + offset),
      scrollIntoView: true,
    });
    view.focus();
    return true;
  };

export const insertCallout = insertBlock("> [!note] Title\n> ", "> [!note] ".length);
export const insertCodeBlock = insertBlock("```\n\n```", 3);
export const insertTable = insertBlock("| Column 1 | Column 2 |\n| --- | --- |\n|  |  |", 2);
export const insertDivider = insertBlock("---");

/** Typing * _ ` = ~ with text selected wraps the selection instead of replacing it (Obsidian's auto-pair). */
export function wrapSelectionOnType(view: EditorView, from: number, to: number, text: string): boolean {
  if (!"*_`=~".includes(text) || text.length !== 1) return false;
  const sel = view.state.selection;
  if (sel.ranges.some((r) => r.empty)) return false;
  view.dispatch({
    ...view.state.changeByRange((r) => ({
      changes: [{ from: r.from, insert: text }, { from: r.to, insert: text }],
      range: EditorSelection.range(r.from + 1, r.to + 1),
    })),
    userEvent: "input.type",
  });
  return true;
}

const EMPTY_MARKUP = /^(\s*)(?:[-*+](?: \[[ xX]\])?|\d+[.)]|>(?:\s*>)*)\s*$/;

/**
 * Enter on a list item / checkbox / quote line with nothing after the marker leaves the list,
 * like Obsidian: a nested item moves out one level, a top-level one loses its marker.
 * Anything else falls through to CodeMirror's "continue the list" Enter.
 */
export const exitEmptyMarkup: Cmd = (view) => {
  const { state } = view;
  if (state.selection.ranges.length !== 1 || !state.selection.main.empty) return false;
  const line = state.doc.lineAt(state.selection.main.head);
  const m = EMPTY_MARKUP.exec(line.text);
  if (!m || state.selection.main.head !== line.to) return false;
  if (m[1].length > 0 && !line.text.trim().startsWith(">")) return indentLess(view);
  view.dispatch({ changes: { from: line.from, to: line.to, insert: "" }, userEvent: "delete" });
  return true;
};

export const obsidianKeymap: KeyBinding[] = [
  { key: "Mod-b", run: toggleWrap("**") },
  { key: "Mod-i", run: toggleWrap("*") },
  { key: "Mod-Shift-x", run: toggleWrap("~~") },
  { key: "Mod-Shift-h", run: toggleWrap("==") },
  { key: "Mod-`", run: toggleWrap("`") },
  { key: "Mod-k", run: insertLink },
  { key: "Mod-l", run: toggleTask },
];
