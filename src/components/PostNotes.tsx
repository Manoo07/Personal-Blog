import { useState, useEffect, useRef, useMemo } from "react";
import {
  Highlighter, MessageSquarePlus, Pencil, Trash2,
  X, Loader2, Check, AlertTriangle, Copy, Quote, Link2, Palette, LogIn, MessageSquareX,
} from "lucide-react";
import ContextMenu, { type MenuEntry } from "@/components/ContextMenu";
import { toast } from "sonner";
import { useCreateNote, useNotes, useUpdateNote, useDeleteNote } from "@/hooks/use-api";
import type { ApiNote } from "@/lib/api";

interface Props {
  postSlug: string;
  articleRef: React.RefObject<HTMLElement | null>;
  /** Signed-out readers still get the right-click menu (copy actions). */
  isLoggedIn: boolean;
  onRequireLogin: () => void;
}

/** Right-click menu target: a text selection or an existing highlight. */
type MenuState =
  | { kind: "selection"; x: number; y: number; text: string; rect: DOMRect; headingId: string | null }
  | { kind: "mark"; x: number; y: number; noteId: string; rect: DOMRect; headingId: string | null };

/** Id of the closest heading at or above `node` inside the article (for section links). */
function nearestHeadingId(article: HTMLElement, node: Node): string | null {
  const headings = Array.from(article.querySelectorAll<HTMLElement>("h1[id], h2[id], h3[id], h4[id], h5[id], h6[id]"));
  let found: string | null = null;
  for (const h of headings) {
    // DOCUMENT_POSITION_FOLLOWING (4): node comes after h
    if (h === node || h.contains(node) || h.compareDocumentPosition(node) & Node.DOCUMENT_POSITION_FOLLOWING) found = h.id;
    else break;
  }
  return found;
}

async function copyText(text: string, okMessage = "Copied") {
  try {
    await navigator.clipboard.writeText(text);
    toast.success(okMessage);
  } catch {
    toast.error("Couldn't access the clipboard");
  }
}

interface SelectionAnchor {
  text: string;
  top: number; bottom: number; left: number; // viewport coords
}

type PopoverMode = "view" | "edit" | "add-note" | "confirm-delete";

interface NotePopover {
  noteId: string;
  selectedText: string;
  note: string | null;
  top: number; left: number; // viewport coords (fixed)
  mode: PopoverMode;
}

// ── Colour palette ────────────────────────────────────────────────────────────

const COLOR_PALETTE = [
  { key: "yellow",  swatch: "#eab308", label: "Yellow"  },
  { key: "indigo",  swatch: "#6366f1", label: "Indigo"  },
  { key: "sky",     swatch: "#38bdf8", label: "Sky"     },
  { key: "emerald", swatch: "#4ade80", label: "Emerald" },
  { key: "orange",  swatch: "#fb923c", label: "Orange"  },
  { key: "violet",  swatch: "#c084fc", label: "Violet"  },
] as const;

type ColorKey = typeof COLOR_PALETTE[number]["key"];

// ── DOM helpers ───────────────────────────────────────────────────────────────

function clearHighlights(container: HTMLElement) {
  container.querySelectorAll("mark[data-note-id]").forEach((mark) => {
    const parent = mark.parentNode!;
    while (mark.firstChild) parent.insertBefore(mark.firstChild, mark);
    parent.removeChild(mark);
  });
  container.normalize();
}

function applyHighlight(container: HTMLElement, note: ApiNote) {
  // Index every text node with its absolute char position in the container's full text.
  // This lets us find matches that span multiple DOM nodes (e.g. syntax-highlighted spans).
  const entries: { node: Text; start: number; end: number }[] = [];
  let pos = 0;
  const walker = document.createTreeWalker(container, NodeFilter.SHOW_TEXT, null);
  let node: Text | null;
  while ((node = walker.nextNode() as Text | null)) {
    const len = node.textContent?.length ?? 0;
    entries.push({ node, start: pos, end: pos + len });
    pos += len;
  }

  const fullText = entries.map((e) => e.node.textContent ?? "").join("");
  const matchStart = fullText.indexOf(note.selectedText);
  if (matchStart === -1) return;
  const matchEnd = matchStart + note.selectedText.length;

  const startEntry = entries.find((e) => e.start <= matchStart && matchStart < e.end);
  const endEntry = entries.find((e) => e.start < matchEnd && matchEnd <= e.end);
  if (!startEntry || !endEntry) return;

  const range = document.createRange();
  range.setStart(startEntry.node, matchStart - startEntry.start);
  range.setEnd(endEntry.node, matchEnd - endEntry.start);

  const mark = document.createElement("mark");
  mark.dataset.noteId = note.id;
  mark.dataset.color = note.color || "yellow";
  mark.className = `note-highlight ${note.note ? "note-has-note" : "note-highlight-only"}`;

  try {
    // Fast path: selection is within a single element
    range.surroundContents(mark);
  } catch {
    // Fallback: range crosses element boundaries (syntax-highlighted code blocks).
    // extractContents preserves child spans; insertNode places the mark in-position.
    mark.appendChild(range.extractContents());
    range.insertNode(mark);
  }
}

export function scrollToHighlight(noteId: string) {
  const mark = document.querySelector(`mark[data-note-id="${noteId}"]`);
  if (!mark) return;
  mark.scrollIntoView({ behavior: "smooth", block: "center" });
  mark.classList.add("note-highlight-pulse");
  setTimeout(() => mark.classList.remove("note-highlight-pulse"), 1800);
}

// ── Layout helper ─────────────────────────────────────────────────────────────

const PANEL_W = 268;
const PANEL_H = 200;

function clampPosition(top: number, bottom: number, left: number) {
  const spaceBelow = window.innerHeight - bottom;
  const panelTop = spaceBelow >= PANEL_H + 8 ? bottom + 8 : top - PANEL_H - 8;
  const panelLeft = Math.max(8, Math.min(left, window.innerWidth - PANEL_W - 8));
  return { top: panelTop, left: panelLeft };
}

// ── Main component ────────────────────────────────────────────────────────────

const PostNotes = ({ postSlug, articleRef, isLoggedIn, onRequireLogin }: Props) => {
  const [menu, setMenu] = useState<MenuState | null>(null);
  const [anchor, setAnchor] = useState<SelectionAnchor | null>(null);
  const [creatingNote, setCreatingNote] = useState(false); // anchor + input panel open
  const [noteText, setNoteText] = useState("");
  const [popover, setPopover] = useState<NotePopover | null>(null);
  const [editText, setEditText] = useState("");
  const [selectedColor, setSelectedColor] = useState<ColorKey>("yellow");

  const inputPanelRef = useRef<HTMLDivElement>(null);
  const popoverRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const editareaRef = useRef<HTMLTextAreaElement>(null);


  const createNote = useCreateNote(postSlug);
  const updateNote = useUpdateNote(postSlug);
  const deleteNote = useDeleteNote(postSlug);
  const { data: notesData } = useNotes(postSlug);
  const notes = useMemo(() => notesData?.notes ?? [], [notesData]);

  // ── Re-apply highlights whenever notes change ────────────────────────────
  useEffect(() => {
    const article = articleRef.current;
    if (!article) return;

    clearHighlights(article);
    for (const note of notes) applyHighlight(article, note);

    const handleMarkClick = (e: Event) => {
      e.stopPropagation();
      const mark = e.currentTarget as HTMLElement;
      const note = notes.find((n) => n.id === mark.dataset.noteId);
      if (!note) return;
      const rect = mark.getBoundingClientRect();
      const panelLeft = Math.max(8, Math.min(rect.left, window.innerWidth - PANEL_W - 8));
      const spaceBelow = window.innerHeight - rect.bottom;
      const panelTop = spaceBelow >= PANEL_H + 8 ? rect.bottom + 8 : rect.top - PANEL_H - 8;
      setPopover({
        noteId: note.id,
        selectedText: note.selectedText,
        note: note.note,
        top: panelTop,
        left: panelLeft,
        mode: note.note ? "view" : "add-note",
      });
      setAnchor(null);
      setCreatingNote(false);
    };

    article.querySelectorAll("mark[data-note-id]").forEach((mark) => {
      (mark as HTMLElement).addEventListener("click", handleMarkClick);
    });
    return () => {
      article.querySelectorAll("mark[data-note-id]").forEach((mark) => {
        (mark as HTMLElement).removeEventListener("click", handleMarkClick);
      });
    };
  }, [notes, articleRef]);

  // ── Close the highlight popover on outside press ────────────────────────
  // Selecting text shows nothing (as in Obsidian's reading view); highlighting
  // and notes are reached through the right-click menu.
  useEffect(() => {
    const handleMouseDown = (e: MouseEvent) => {
      if (inputPanelRef.current?.contains(e.target as Node)) return;
      if (popoverRef.current?.contains(e.target as Node)) return;
      if ((e.target as HTMLElement).closest("mark[data-note-id], [data-article-menu]")) return;
      setPopover(null);
    };
    document.addEventListener("mousedown", handleMouseDown);
    return () => document.removeEventListener("mousedown", handleMouseDown);
  }, []);

  // ── Right-click menu (Obsidian-style) ───────────────────────────────────
  useEffect(() => {
    const article = articleRef.current;
    if (!article) return;

    const onContextMenu = (e: MouseEvent) => {
      const target = e.target as HTMLElement;

      // 1) Right-click on an existing highlight
      const mark = target.closest<HTMLElement>("mark[data-note-id]");
      if (mark && article.contains(mark)) {
        e.preventDefault();
        setAnchor(null);
        setPopover(null);
        setMenu({
          kind: "mark", x: e.clientX, y: e.clientY, noteId: mark.dataset.noteId!,
          rect: mark.getBoundingClientRect(), headingId: nearestHeadingId(article, mark),
        });
        return;
      }

      // 2) Right-click on selected text inside the article
      const sel = window.getSelection();
      const text = sel?.toString().trim() ?? "";
      if (sel && !sel.isCollapsed && text) {
        const range = sel.getRangeAt(0);
        if (article.contains(range.commonAncestorContainer)) {
          e.preventDefault();
          setAnchor(null);
          setPopover(null);
          setMenu({
            kind: "selection", x: e.clientX, y: e.clientY, text,
            rect: range.getBoundingClientRect(),
            headingId: nearestHeadingId(article, range.startContainer),
          });
          return;
        }
      }
      // 3) Otherwise keep the browser's native menu (links, images, etc.)
    };

    article.addEventListener("contextmenu", onContextMenu);
    return () => article.removeEventListener("contextmenu", onContextMenu);
  }, [articleRef]);

  // Focus textareas when their panels open
  useEffect(() => {
    if (creatingNote) setTimeout(() => textareaRef.current?.focus(), 40);
  }, [creatingNote]);
  useEffect(() => {
    if (popover?.mode === "edit" || popover?.mode === "add-note") {
      setTimeout(() => editareaRef.current?.focus(), 40);
    }
  }, [popover?.mode]);

  // ── Actions ───────────────────────────────────────────────────────────────

  const dismissAnchor = () => {
    setAnchor(null);
    setCreatingNote(false);
    setNoteText("");
    window.getSelection()?.removeAllRanges();
  };

  // Create highlight + note
  const handleSaveNew = async () => {
    if (!anchor || !noteText.trim()) return;
    try {
      await createNote.mutateAsync({ selectedText: anchor.text, note: noteText.trim(), color: selectedColor });
      toast.success("Note saved");
      dismissAnchor();
    } catch { toast.error("Failed to save note"); }
  };

  // Save edited note
  const handleSaveEdit = async () => {
    if (!popover) return;
    try {
      await updateNote.mutateAsync({ noteId: popover.noteId, data: { note: editText.trim() || null } });
      toast.success("Note updated");
      setPopover((p) => p ? { ...p, note: editText.trim() || null, mode: editText.trim() ? "view" : "add-note" } : null);
    } catch { toast.error("Failed to update note"); }
  };

  // Delete only the note (keep highlight)
  const handleRemoveNoteOnly = async () => {
    if (!popover) return;
    try {
      await updateNote.mutateAsync({ noteId: popover.noteId, data: { note: null } });
      toast.success("Note removed — highlight kept");
      setPopover((p) => p ? { ...p, note: null, mode: "add-note" } : null);
    } catch { toast.error("Failed to remove note"); }
  };

  // Delete the entire highlight (+ note)
  const handleDeleteHighlight = async () => {
    if (!popover) return;
    try {
      await deleteNote.mutateAsync(popover.noteId);
      toast.success("Highlight removed");
      setPopover(null);
    } catch { toast.error("Failed to delete highlight"); }
  };

  const keyDownNew = (e: React.KeyboardEvent) => {
    if (e.key === "Escape") dismissAnchor();
    if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) handleSaveNew();
  };
  const keyDownEdit = (e: React.KeyboardEvent) => {
    if (e.key === "Escape") setPopover((p) => p ? { ...p, mode: p.note ? "view" : "add-note" } : null);
    if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) handleSaveEdit();
  };

  // ── Render ────────────────────────────────────────────────────────────────

  const anchorPos = anchor ? clampPosition(anchor.top, anchor.bottom, anchor.left) : null;

  const sectionLink = (headingId: string | null) =>
    `${window.location.origin}${window.location.pathname}${headingId ? `#${headingId}` : ""}`;

  const menuEntries = (): MenuEntry[] => {
    if (!menu) return [];
    const linkEntry: MenuEntry = {
      type: "item", label: menu.headingId ? "Copy link to section" : "Copy link to post", icon: Link2,
      onSelect: () => copyText(sectionLink(menu.headingId), "Link copied"),
    };

    if (menu.kind === "selection") {
      const { text, rect } = menu;
      const clear = () => window.getSelection()?.removeAllRanges();
      const highlightEntries: MenuEntry[] = isLoggedIn
        ? [
            {
              type: "swatches", label: "Highlight", icon: Highlighter, colors: COLOR_PALETTE, current: selectedColor,
              onPick: async (color) => {
                setSelectedColor(color as ColorKey);
                try {
                  await createNote.mutateAsync({ selectedText: text, note: null, color });
                  toast.success("Highlighted");
                  clear();
                } catch { toast.error("Failed to save highlight"); }
              },
            },
            {
              type: "item", label: "Highlight with note…", icon: MessageSquarePlus,
              onSelect: () => {
                setAnchor({ text, top: rect.top, bottom: rect.bottom, left: rect.left });
                setCreatingNote(true);
              },
            },
          ]
        : [{ type: "item", label: "Sign in to highlight", icon: LogIn, onSelect: onRequireLogin }];

      return [
        ...highlightEntries,
        { type: "separator" },
        { type: "item", label: "Copy", icon: Copy, hint: "⌘C", onSelect: () => copyText(text) },
        {
          type: "item", label: "Copy as quote", icon: Quote,
          onSelect: () => copyText(text.split("\n").map((l) => `> ${l}`).join("\n"), "Quote copied"),
        },
        linkEntry,
      ];
    }

    // Existing highlight
    const note = notes.find((n) => n.id === menu.noteId);
    if (!note) return [linkEntry];
    const { rect } = menu;
    const openEditor = () => {
      const { top, left } = clampPosition(rect.top, rect.bottom, rect.left);
      setEditText(note.note ?? "");
      setPopover({ noteId: note.id, selectedText: note.selectedText, note: note.note, top, left, mode: "edit" });
    };

    return [
      { type: "label", label: `“${note.selectedText}”` },
      { type: "item", label: note.note ? "Edit note" : "Add note", icon: note.note ? Pencil : MessageSquarePlus, onSelect: openEditor },
      {
        type: "swatches", label: "Colour", icon: Palette, colors: COLOR_PALETTE, current: note.color,
        onPick: async (color) => {
          if (color === note.color) return;
          try { await updateNote.mutateAsync({ noteId: note.id, data: { color } }); }
          catch { toast.error("Failed to change colour"); }
        },
      },
      { type: "separator" },
      { type: "item", label: "Copy text", icon: Copy, onSelect: () => copyText(note.selectedText) },
      linkEntry,
      { type: "separator" },
      ...(note.note
        ? [{
            type: "item" as const, label: "Remove note", icon: MessageSquareX,
            onSelect: async () => {
              try { await updateNote.mutateAsync({ noteId: note.id, data: { note: null } }); toast.success("Note removed — highlight kept"); }
              catch { toast.error("Failed to remove note"); }
            },
          }]
        : []),
      {
        type: "item", label: "Remove highlight", icon: Trash2, danger: true,
        onSelect: async () => {
          try { await deleteNote.mutateAsync(note.id); toast.success("Highlight removed"); }
          catch { toast.error("Failed to delete highlight"); }
        },
      },
    ];
  };

  return (
    <>
      {menu && (
        <ContextMenu x={menu.x} y={menu.y} entries={menuEntries()} onClose={() => setMenu(null)} />
      )}

      {/* ── Note input panel ── */}
      {anchor && creatingNote && (
        <div
          ref={inputPanelRef}
          style={{ position: "fixed", top: anchorPos!.top, left: anchorPos!.left, width: PANEL_W, zIndex: 50 }}
          className="rounded-lg border border-border bg-card shadow-xl p-3 flex flex-col gap-2"
        >
          <p className="text-[10px] text-muted-foreground italic line-clamp-2 border-l-2 border-amber-400/60 pl-2 leading-snug">
            "{anchor.text}"
          </p>
          <div className="flex items-center gap-2">
            <span className="text-[9px] text-muted-foreground/50 uppercase tracking-wide flex-shrink-0">Color</span>
            <div className="flex items-center gap-1.5">
              {COLOR_PALETTE.map((c) => (
                <button
                  key={c.key}
                  title={c.label}
                  style={{ backgroundColor: c.swatch }}
                  className={`w-3.5 h-3.5 rounded-full border-2 transition-transform ${
                    selectedColor === c.key
                      ? "border-foreground/60 scale-110"
                      : "border-transparent hover:scale-110"
                  }`}
                  onClick={() => setSelectedColor(c.key)}
                />
              ))}
            </div>
          </div>
          <textarea
            ref={textareaRef}
            value={noteText}
            onChange={(e) => setNoteText(e.target.value)}
            onKeyDown={keyDownNew}
            placeholder="Write a note…"
            rows={3}
            className="w-full resize-none rounded-md border border-border bg-background px-2.5 py-1.5 text-sm text-foreground placeholder:text-muted-foreground/60 focus:outline-none focus:ring-1 focus:ring-primary"
          />
          <div className="flex items-center justify-between">
            <span className="text-[10px] text-muted-foreground/50">⌘↵ save</span>
            <div className="flex gap-1.5">
              <button onClick={dismissAnchor} className="p-1.5 rounded hover:bg-muted transition-colors">
                <X className="w-3.5 h-3.5 text-muted-foreground" />
              </button>
              <button
                onClick={handleSaveNew}
                disabled={!noteText.trim() || createNote.isPending}
                className="flex items-center gap-1 px-2.5 py-1 rounded bg-primary text-primary-foreground text-xs font-medium hover:opacity-90 transition-opacity disabled:opacity-50"
              >
                {createNote.isPending ? <Loader2 className="w-3 h-3 animate-spin" /> : <Check className="w-3 h-3" />}
                Save
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Note popover ── */}
      {popover && (
        <div
          ref={popoverRef}
          style={{ position: "fixed", top: popover.top, left: popover.left, width: PANEL_W, zIndex: 50 }}
          className="rounded-lg border border-border bg-card shadow-xl flex flex-col overflow-hidden"
        >
          {/* Header: quoted selected text */}
          <div className="flex items-start gap-2 px-3 pt-3 pb-2 border-b border-border/40">
            <p className="flex-1 text-[10px] text-muted-foreground italic line-clamp-2 border-l-2 border-amber-400/60 pl-2 leading-snug">
              "{popover.selectedText}"
            </p>
            <button
              onClick={() => setPopover(null)}
              className="flex-shrink-0 p-0.5 rounded hover:bg-muted transition-colors"
            >
              <X className="w-3.5 h-3.5 text-muted-foreground" />
            </button>
          </div>

          {/* VIEW mode */}
          {popover.mode === "view" && (
            <>
              <p className="px-3 py-2.5 text-sm text-foreground leading-snug">{popover.note}</p>
              <div className="border-t border-border/40 px-3 py-2 flex items-center justify-between gap-1">
                <button
                  onClick={() => { setEditText(popover.note ?? ""); setPopover((p) => p ? { ...p, mode: "edit" } : null); }}
                  className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors px-2 py-1 rounded hover:bg-muted"
                >
                  <Pencil className="w-3 h-3" /> Edit note
                </button>
                <div className="flex gap-1">
                  <button
                    onClick={handleRemoveNoteOnly}
                    disabled={updateNote.isPending}
                    className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors px-2 py-1 rounded hover:bg-muted disabled:opacity-50"
                    title="Remove note but keep highlight"
                  >
                    {updateNote.isPending ? <Loader2 className="w-3 h-3 animate-spin" /> : <MessageSquarePlus className="w-3 h-3" />}
                    Remove note
                  </button>
                  <button
                    onClick={() => setPopover((p) => p ? { ...p, mode: "confirm-delete" } : null)}
                    className="flex items-center gap-1 text-xs text-muted-foreground hover:text-destructive transition-colors px-2 py-1 rounded hover:bg-muted"
                    title="Remove highlight and note"
                  >
                    <Trash2 className="w-3 h-3" /> Remove highlight
                  </button>
                </div>
              </div>
            </>
          )}

          {/* ADD-NOTE mode (highlight exists but no note yet) */}
          {popover.mode === "add-note" && (
            <>
              <p className="px-3 py-2.5 text-xs text-muted-foreground/70 italic">No note yet.</p>
              <div className="border-t border-border/40 px-3 py-2 flex items-center gap-2">
                <button
                  onClick={() => { setEditText(""); setPopover((p) => p ? { ...p, mode: "edit" } : null); }}
                  className="flex-1 flex items-center justify-center gap-1.5 px-2.5 py-1.5 rounded-md border border-border text-xs font-medium hover:bg-muted transition-colors"
                >
                  <MessageSquarePlus className="w-3.5 h-3.5 text-primary" /> Add note
                </button>
                <button
                  onClick={() => setPopover((p) => p ? { ...p, mode: "confirm-delete" } : null)}
                  className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-md border border-destructive/40 text-xs text-destructive hover:bg-destructive/10 transition-colors"
                >
                  <Trash2 className="w-3.5 h-3.5" /> Remove highlight
                </button>
              </div>
            </>
          )}

          {/* EDIT / ADD-NOTE input mode */}
          {popover.mode === "edit" && (
            <div className="px-3 py-2.5 flex flex-col gap-2">
              <textarea
                ref={editareaRef}
                value={editText}
                onChange={(e) => setEditText(e.target.value)}
                onKeyDown={keyDownEdit}
                placeholder="Write a note…"
                rows={3}
                className="w-full resize-none rounded-md border border-border bg-background px-2.5 py-1.5 text-sm text-foreground placeholder:text-muted-foreground/60 focus:outline-none focus:ring-1 focus:ring-primary"
              />
              <div className="flex items-center justify-between">
                <span className="text-[10px] text-muted-foreground/50">⌘↵ save</span>
                <div className="flex gap-1.5">
                  <button
                    onClick={() => setPopover((p) => p ? { ...p, mode: p.note ? "view" : "add-note" } : null)}
                    className="p-1.5 rounded hover:bg-muted transition-colors"
                  >
                    <X className="w-3.5 h-3.5 text-muted-foreground" />
                  </button>
                  <button
                    onClick={handleSaveEdit}
                    disabled={updateNote.isPending}
                    className="flex items-center gap-1 px-2.5 py-1 rounded bg-primary text-primary-foreground text-xs font-medium hover:opacity-90 transition-opacity disabled:opacity-50"
                  >
                    {updateNote.isPending ? <Loader2 className="w-3 h-3 animate-spin" /> : <Check className="w-3 h-3" />}
                    Save
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* CONFIRM DELETE mode */}
          {popover.mode === "confirm-delete" && (
            <div className="px-3 py-3 flex flex-col gap-2">
              <div className="flex items-center gap-1.5 text-xs text-muted-foreground mb-1">
                <AlertTriangle className="w-3.5 h-3.5 text-amber-500 flex-shrink-0" />
                What would you like to remove?
              </div>
              {popover.note && (
                <button
                  onClick={handleRemoveNoteOnly}
                  disabled={updateNote.isPending}
                  className="flex items-center gap-2 px-3 py-2 rounded-md border border-border text-xs hover:bg-muted transition-colors text-left disabled:opacity-50"
                >
                  {updateNote.isPending ? <Loader2 className="w-3 h-3 animate-spin" /> : <MessageSquarePlus className="w-3.5 h-3.5 text-muted-foreground" />}
                  Remove note only (keep highlight)
                </button>
              )}
              <button
                onClick={handleDeleteHighlight}
                disabled={deleteNote.isPending}
                className="flex items-center gap-2 px-3 py-2 rounded-md border border-destructive/40 text-xs text-destructive hover:bg-destructive/10 transition-colors text-left disabled:opacity-50"
              >
                {deleteNote.isPending ? <Loader2 className="w-3 h-3 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />}
                Remove highlight {popover.note ? "and note" : ""}
              </button>
              <button
                onClick={() => setPopover((p) => p ? { ...p, mode: p.note ? "view" : "add-note" } : null)}
                className="text-xs text-muted-foreground hover:text-foreground transition-colors text-center py-1"
              >
                Cancel
              </button>
            </div>
          )}
        </div>
      )}
    </>
  );
};

export default PostNotes;
