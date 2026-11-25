/**
 * Obsidian-like markdown editor (CodeMirror 6, the same engine Obsidian uses).
 *
 * - Live Preview / Source / Reading modes (⌘E toggles Reading, like Obsidian)
 * - Obsidian shortcuts: ⌘B ⌘I ⌘K ⌘L, ⌘⇧X strike, ⌘⇧H highlight, ⌘` code, ⌘F search,
 *   ⌘] / ⌘[ indent, ⌥↑/⌥↓ move line, ⌘D select next match, Enter continues lists
 * - [[ autocompletes links to other posts; "> [!" autocompletes callout types
 * - paste / drop images (handed to the parent for upload); paste a URL over a selection to link it
 */
import { forwardRef, useEffect, useImperativeHandle, useMemo, useRef, useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import rehypeHighlight from "rehype-highlight";
import { EditorSelection, EditorState, Compartment, Prec } from "@codemirror/state";
import { EditorView, keymap, placeholder as placeholderExt, drawSelection, dropCursor, highlightActiveLine } from "@codemirror/view";
import { defaultKeymap, history, historyKeymap, indentWithTab } from "@codemirror/commands";
import { markdown, markdownLanguage } from "@codemirror/lang-markdown";
import { languages } from "@codemirror/language-data";
import { HighlightStyle, syntaxHighlighting, indentOnInput, bracketMatching } from "@codemirror/language";
import { search, searchKeymap, highlightSelectionMatches } from "@codemirror/search";
import {
  autocompletion,
  closeBrackets,
  closeBracketsKeymap,
  completionKeymap,
  type Completion,
  type CompletionContext,
} from "@codemirror/autocomplete";
import { tags as t } from "@lezer/highlight";
import {
  Bold, Italic, Strikethrough, Highlighter, Code, Link, Heading1, Heading2, Heading3, List, ListOrdered,
  ListTodo, TextQuote, MessageSquareText, SquareCode, Table, Minus, ImagePlus, Eye, FileCode, BookOpen,
  Maximize2, Minimize2, Loader2, Keyboard,
} from "lucide-react";
import remarkObsidian from "@/lib/remark-obsidian";
import { markdownComponents } from "@/lib/markdown-components";
import { cn } from "@/lib/utils";
import { isUploadableFile } from "@/lib/image-upload";
import { CALLOUT_TYPES, HighlightSyntax, highlightTag, livePreview } from "./live-preview";
import {
  insertCallout, insertCodeBlock, insertDivider, insertLink, insertTable, obsidianKeymap, setHeading,
  toggleLinePrefix, toggleTask, toggleWrap, wrapSelectionOnType, exitEmptyMarkup,
} from "./commands";
import "./obsidian-editor.css";

export interface EditorNote {
  title: string;
  slug: string;
  section?: string | null;
}

export interface ObsidianEditorHandle {
  /** Insert text at the cursor (replacing the selection). */
  insert(text: string): void;
  /** Replace the first occurrence of `find`; returns false if it's no longer in the document. */
  replace(find: string, replacement: string): boolean;
  focus(): void;
}

interface Props {
  value: string;
  onChange: (value: string) => void;
  /** Other posts, for [[ link autocomplete. */
  notes?: EditorNote[];
  /** Image files pasted or dropped into the editor. */
  onImageFiles?: (files: File[]) => void;
  /** Toolbar "image" button. */
  onPickImage?: () => void;
  uploading?: number;
  placeholder?: string;
}

type Mode = "live" | "source" | "reading";
const MODE_KEY = "obsidian-editor-mode";
const LINK_BASE = "/Personal-Blog/blog/";

const highlightStyle = HighlightStyle.define([
  { tag: t.heading, fontWeight: "700" },
  { tag: t.strong, fontWeight: "700" },
  { tag: t.emphasis, fontStyle: "italic" },
  { tag: t.strikethrough, textDecoration: "line-through" },
  { tag: highlightTag, class: "cm-lp-mark" },
  { tag: t.monospace, class: "cm-lp-inline-code" },
  { tag: [t.link, t.url], class: "cm-lp-url" },
  { tag: [t.processingInstruction, t.contentSeparator, t.meta], class: "cm-lp-syntax" },
  { tag: t.quote, class: "cm-lp-quote-text" },
  // fenced code
  { tag: [t.keyword, t.controlKeyword, t.operatorKeyword, t.modifier], color: "hsl(var(--code-syntax-keyword))" },
  { tag: [t.string, t.special(t.string), t.regexp], color: "hsl(var(--code-syntax-string))" },
  { tag: [t.comment, t.lineComment, t.blockComment], color: "hsl(var(--code-syntax-comment))", fontStyle: "italic" },
  { tag: [t.function(t.variableName), t.function(t.propertyName)], color: "hsl(var(--code-syntax-function))" },
  { tag: [t.number, t.bool, t.null, t.atom], color: "hsl(var(--code-syntax-number))" },
  { tag: [t.typeName, t.className, t.standard(t.variableName)], color: "hsl(var(--code-syntax-builtin))" },
]);

function wordCount(text: string) {
  const words = text.trim() ? text.trim().split(/\s+/).length : 0;
  return { words, chars: text.length };
}

const ObsidianEditor = forwardRef<ObsidianEditorHandle, Props>(function ObsidianEditor(
  { value, onChange, notes = [], onImageFiles, onPickImage, uploading = 0, placeholder = "Start writing…" },
  ref
) {
  const hostRef = useRef<HTMLDivElement>(null);
  const viewRef = useRef<EditorView | null>(null);
  const previewCompartment = useRef(new Compartment());
  const [mode, setMode] = useState<Mode>(() => (localStorage.getItem(MODE_KEY) as Mode) || "live");
  const lastEditMode = useRef<Exclude<Mode, "reading">>(mode === "source" ? "source" : "live");
  const [fullscreen, setFullscreen] = useState(false);
  const [dragging, setDragging] = useState(false);
  const [showKeys, setShowKeys] = useState(false);
  const [stats, setStats] = useState(() => wordCount(value));

  // Latest props for long-lived CodeMirror callbacks
  const onChangeRef = useRef(onChange);
  const onImageFilesRef = useRef(onImageFiles);
  const notesRef = useRef(notes);
  onChangeRef.current = onChange;
  onImageFilesRef.current = onImageFiles;
  notesRef.current = notes;

  const setModeAndRemember = (m: Mode) => {
    if (m !== "reading") lastEditMode.current = m;
    localStorage.setItem(MODE_KEY, m);
    setMode(m);
  };
  const toggleReading = () => setModeAndRemember(mode === "reading" ? lastEditMode.current : "reading");
  const toggleReadingRef = useRef(toggleReading);
  toggleReadingRef.current = toggleReading;

  /* ── create the editor once ── */
  useEffect(() => {
    if (!hostRef.current) return;

    const noteLinks = (ctx: CompletionContext) => {
      const m = ctx.matchBefore(/\[\[[^\]\n]*/);
      if (!m) return null;
      const options: Completion[] = notesRef.current.map((n) => ({
        label: n.title,
        detail: n.section ?? undefined,
        apply: (view, _c, from, to) => {
          const end = view.state.sliceDoc(to, to + 2) === "]]" ? to + 2 : to;
          const insert = `[${n.title}](${LINK_BASE}${n.slug})`;
          view.dispatch({ changes: { from: from - 2, to: end, insert }, selection: EditorSelection.cursor(from - 2 + insert.length) });
        },
      }));
      return { from: m.from + 2, options, validFor: /^[^\]\n]*$/ };
    };

    const calloutTypes = (ctx: CompletionContext) => {
      const line = ctx.state.doc.lineAt(ctx.pos);
      const m = ctx.matchBefore(/\[![\w-]*/);
      if (!m || !/^\s*>\s*$/.test(line.text.slice(0, m.from - line.from))) return null;
      return {
        from: m.from + 2,
        options: CALLOUT_TYPES.map((type) => ({
          label: type,
          type: "keyword",
          apply: (view: EditorView, _c: Completion, from: number, to: number) => {
            const end = view.state.sliceDoc(to, to + 1) === "]" ? to + 1 : to;
            view.dispatch({ changes: { from, to: end, insert: `${type}] ` }, selection: EditorSelection.cursor(from + type.length + 2) });
          },
        })),
        validFor: /^[\w-]*$/,
      };
    };

    const state = EditorState.create({
      doc: value,
      extensions: [
        history(),
        drawSelection(),
        dropCursor(),
        indentOnInput(),
        bracketMatching(),
        closeBrackets(),
        highlightActiveLine(),
        highlightSelectionMatches(),
        search({ top: true }),
        autocompletion({ override: [noteLinks, calloutTypes], icons: false }),
        EditorView.lineWrapping,
        EditorState.languageData.of(() => [{ closeBrackets: { brackets: ["(", "[", "{"] } }]),
        markdown({ base: markdownLanguage, codeLanguages: languages, extensions: [HighlightSyntax] }),
        syntaxHighlighting(highlightStyle),
        previewCompartment.current.of(mode === "source" ? [] : livePreview),
        placeholderExt(placeholder),
        // must beat lang-markdown's own (high-precedence) Enter
        Prec.highest(keymap.of([{ key: "Enter", run: exitEmptyMarkup }])),
        keymap.of([
          { key: "Mod-e", run: () => (toggleReadingRef.current(), true) },
          ...obsidianKeymap,
          ...closeBracketsKeymap,
          ...defaultKeymap,
          ...searchKeymap,
          ...historyKeymap,
          ...completionKeymap,
          indentWithTab,
        ]),
        EditorView.inputHandler.of(wrapSelectionOnType),
        EditorView.updateListener.of((u) => {
          if (u.docChanged) {
            const text = u.state.doc.toString();
            onChangeRef.current(text);
            setStats(wordCount(text));
          }
        }),
        EditorView.domEventHandlers({
          paste(e, view) {
            const files = Array.from(e.clipboardData?.files ?? []).filter(isUploadableFile);
            if (files.length && onImageFilesRef.current) {
              e.preventDefault();
              onImageFilesRef.current(files);
              return true;
            }
            // Paste a URL over selected text: make it a link (Obsidian behaviour)
            const text = e.clipboardData?.getData("text/plain")?.trim() ?? "";
            const sel = view.state.selection.main;
            if (!sel.empty && /^https?:\/\/\S+$/.test(text) && !/\n/.test(view.state.sliceDoc(sel.from, sel.to))) {
              e.preventDefault();
              const label = view.state.sliceDoc(sel.from, sel.to);
              view.dispatch({ changes: { from: sel.from, to: sel.to, insert: `[${label}](${text})` } });
              return true;
            }
            return false;
          },
          dragover(e) {
            if (Array.from(e.dataTransfer?.types ?? []).includes("Files")) {
              e.preventDefault();
              setDragging(true);
            }
            return false;
          },
          dragleave() {
            setDragging(false);
            return false;
          },
          drop(e, view) {
            setDragging(false);
            const files = Array.from(e.dataTransfer?.files ?? []).filter(isUploadableFile);
            if (!files.length || !onImageFilesRef.current) return false;
            e.preventDefault();
            const pos = view.posAtCoords({ x: e.clientX, y: e.clientY });
            if (pos != null) view.dispatch({ selection: EditorSelection.cursor(pos) });
            view.focus();
            onImageFilesRef.current(files);
            return true;
          },
        }),
      ],
    });

    const view = new EditorView({ state, parent: hostRef.current });
    viewRef.current = view;
    return () => {
      view.destroy();
      viewRef.current = null;
    };
    // The editor is created once; later prop changes flow in through refs and the effects below.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /* ── external value changes (e.g. switching posts) ── */
  useEffect(() => {
    const view = viewRef.current;
    if (!view) return;
    const current = view.state.doc.toString();
    if (value !== current) {
      view.dispatch({ changes: { from: 0, to: current.length, insert: value } });
    }
  }, [value]);

  /* ── live preview on/off ── */
  useEffect(() => {
    viewRef.current?.dispatch({
      effects: previewCompartment.current.reconfigure(mode === "source" ? [] : livePreview),
    });
    if (mode !== "reading") requestAnimationFrame(() => viewRef.current?.requestMeasure());
  }, [mode]);

  /* ── Esc leaves full screen ── */
  useEffect(() => {
    if (!fullscreen) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setFullscreen(false);
    window.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [fullscreen]);

  useImperativeHandle(ref, () => ({
    insert(text) {
      const view = viewRef.current;
      if (!view) return onChangeRef.current(value + text);
      const sel = view.state.selection.main;
      view.dispatch({
        changes: { from: sel.from, to: sel.to, insert: text },
        selection: EditorSelection.cursor(sel.from + text.length),
        scrollIntoView: true,
      });
    },
    replace(find, replacement) {
      const view = viewRef.current;
      if (!view) return false;
      const idx = view.state.doc.toString().indexOf(find);
      if (idx < 0) return false;
      view.dispatch({ changes: { from: idx, to: idx + find.length, insert: replacement } });
      return true;
    },
    focus() {
      viewRef.current?.focus();
    },
  }));

  const run = (cmd: (v: EditorView) => boolean) => () => {
    const view = viewRef.current;
    if (!view) return;
    if (mode === "reading") setModeAndRemember(lastEditMode.current);
    cmd(view);
  };

  const tools = useMemo(
    () => [
      [
        { icon: Bold, label: "Bold", keys: "⌘B", cmd: toggleWrap("**") },
        { icon: Italic, label: "Italic", keys: "⌘I", cmd: toggleWrap("*") },
        { icon: Strikethrough, label: "Strikethrough", keys: "⌘⇧X", cmd: toggleWrap("~~") },
        { icon: Highlighter, label: "Highlight", keys: "⌘⇧H", cmd: toggleWrap("==") },
        { icon: Code, label: "Inline code", keys: "⌘`", cmd: toggleWrap("`") },
        { icon: Link, label: "Link", keys: "⌘K", cmd: insertLink },
      ],
      [
        { icon: Heading1, label: "Heading 1", cmd: setHeading(1) },
        { icon: Heading2, label: "Heading 2", cmd: setHeading(2) },
        { icon: Heading3, label: "Heading 3", cmd: setHeading(3) },
      ],
      [
        { icon: List, label: "Bullet list", cmd: toggleLinePrefix("- ", /^\s*[-*+] (?!\[[ xX]\] )/) },
        { icon: ListOrdered, label: "Numbered list", cmd: toggleLinePrefix("1. ", /^\s*\d+[.)] /) },
        { icon: ListTodo, label: "Checklist", keys: "⌘L", cmd: toggleTask },
        { icon: TextQuote, label: "Quote", cmd: toggleLinePrefix("> ", /^\s*> ?/) },
        { icon: MessageSquareText, label: "Callout", cmd: insertCallout },
        { icon: SquareCode, label: "Code block", cmd: insertCodeBlock },
        { icon: Table, label: "Table", cmd: insertTable },
        { icon: Minus, label: "Divider", cmd: insertDivider },
      ],
    ],
    []
  );

  const modes: { id: Mode; label: string; icon: typeof Eye; title: string }[] = [
    { id: "live", label: "Live preview", icon: Eye, title: "Live preview: formatting shows as you write" },
    { id: "source", label: "Source", icon: FileCode, title: "Source mode: plain markdown" },
    { id: "reading", label: "Reading", icon: BookOpen, title: "Reading view (⌘E)" },
  ];

  return (
    <div
      className={cn(
        "obs-editor flex flex-col rounded-lg border bg-background overflow-hidden",
        dragging ? "border-primary border-dashed ring-2 ring-primary/25" : "border-border",
        fullscreen ? "fixed inset-0 z-[60] rounded-none border-0" : "h-[72vh] min-h-[460px]"
      )}
    >
      {/* Toolbar */}
      <div className="flex items-center gap-1 px-2 h-11 border-b border-border bg-secondary/60 overflow-x-auto shrink-0 [scrollbar-width:none]">
        {tools.map((group, gi) => (
          <div key={gi} className="flex items-center gap-0.5 pr-1 mr-1 border-r border-border/70 last:border-r-0">
            {group.map(({ icon: Icon, label, keys, cmd }) => (
              <button
                key={label}
                type="button"
                onMouseDown={(e) => e.preventDefault()}
                onClick={run(cmd)}
                className="obs-tool"
                title={keys ? `${label} (${keys})` : label}
                aria-label={label}
              >
                <Icon className="w-4 h-4" strokeWidth={1.9} />
              </button>
            ))}
          </div>
        ))}
        {onPickImage && (
          <button
            type="button"
            onClick={onPickImage}
            disabled={uploading > 0}
            className="obs-tool w-auto px-2 gap-1.5"
            title="Add images or PDFs (or paste / drop them into the editor)"
          >
            {uploading > 0 ? <Loader2 className="w-4 h-4 animate-spin" /> : <ImagePlus className="w-4 h-4" strokeWidth={1.9} />}
            <span className="text-[12px]">{uploading > 0 ? `Uploading ${uploading}…` : "Image / PDF"}</span>
          </button>
        )}

        <div className="ml-auto flex items-center gap-1 pl-2 shrink-0">
          <div className="flex items-center rounded-md bg-background/70 border border-border p-0.5" role="tablist" aria-label="Editor mode">
            {modes.map(({ id, label, icon: Icon, title }) => (
              <button
                key={id}
                type="button"
                role="tab"
                aria-selected={mode === id}
                onClick={() => setModeAndRemember(id)}
                title={title}
                className={cn(
                  "inline-flex items-center gap-1.5 h-7 px-2 rounded-[5px] text-[12px] transition-colors",
                  mode === id ? "bg-primary/10 text-primary font-medium" : "text-muted-foreground hover:text-foreground"
                )}
              >
                <Icon className="w-3.5 h-3.5" />
                <span className="hidden md:inline">{label}</span>
              </button>
            ))}
          </div>
          <button type="button" onClick={() => setShowKeys((s) => !s)} className="obs-tool" title="Keyboard shortcuts" aria-label="Keyboard shortcuts">
            <Keyboard className="w-4 h-4" strokeWidth={1.9} />
          </button>
          <button
            type="button"
            onClick={() => setFullscreen((f) => !f)}
            className="obs-tool"
            title={fullscreen ? "Exit full screen (Esc)" : "Full screen"}
            aria-label={fullscreen ? "Exit full screen" : "Full screen"}
          >
            {fullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {showKeys && (
        <div className="shrink-0 border-b border-border bg-secondary/40 px-4 py-3 text-[12.5px] text-muted-foreground grid grid-cols-2 md:grid-cols-4 gap-x-6 gap-y-1">
          {[
            ["⌘B / ⌘I", "bold / italic"], ["⌘⇧X / ⌘⇧H", "strike / highlight"], ["⌘`", "inline code"], ["⌘K", "link"],
            ["⌘L", "checklist item"], ["⌘E", "reading view"], ["⌘F", "find & replace"], ["⌘D", "select next match"],
            ["Tab / ⇧Tab", "indent list"], ["⌥↑ / ⌥↓", "move line"], ["[[", "link another post"], ["> [!", "callout type"],
          ].map(([k, d]) => (
            <div key={k} className="flex gap-2">
              <kbd className="font-mono text-foreground whitespace-nowrap">{k}</kbd>
              <span>{d}</span>
            </div>
          ))}
        </div>
      )}

      {/* Editor (kept mounted in Reading view so uploads and cursor survive) */}
      <div className={cn("relative flex-1 min-h-0", mode === "reading" && "hidden")}>
        <div ref={hostRef} className={cn("h-full", mode === "source" && "obs-source")} />
      </div>

      {mode === "reading" && (
        <div
          className="flex-1 min-h-0 overflow-auto"
          tabIndex={0}
          onKeyDown={(e) => {
            if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "e") {
              e.preventDefault();
              toggleReading();
            }
          }}
        >
          <article className="prose max-w-[760px] mx-auto px-5 sm:px-8 py-6">
            <ReactMarkdown remarkPlugins={[remarkGfm, remarkObsidian]} rehypePlugins={[rehypeHighlight]} components={markdownComponents}>
              {value || "*Nothing written yet.*"}
            </ReactMarkdown>
          </article>
        </div>
      )}

      {/* Status bar */}
      <div className="shrink-0 flex items-center justify-end gap-4 h-7 px-3 border-t border-border bg-secondary/40 text-[11.5px] text-muted-foreground tabular-nums">
        {dragging && <span className="mr-auto text-primary">Drop images or PDFs to upload</span>}
        <span>{stats.words.toLocaleString()} words</span>
        <span>{stats.chars.toLocaleString()} characters</span>
      </div>
    </div>
  );
});

export default ObsidianEditor;
