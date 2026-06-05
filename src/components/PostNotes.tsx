import { useState, useEffect, useRef } from "react";
import {
  Highlighter, MessageSquarePlus, Pencil, Trash2,
  X, Loader2, Check, AlertTriangle,
} from "lucide-react";
import { toast } from "sonner";
import { useCreateNote, useNotes, useUpdateNote, useDeleteNote } from "@/hooks/use-api";
import type { ApiNote } from "@/lib/api";

interface Props {
  postSlug: string;
  articleRef: React.RefObject<HTMLElement | null>;
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
  const walker = document.createTreeWalker(container, NodeFilter.SHOW_TEXT, null);
  let node: Text | null;
  while ((node = walker.nextNode() as Text | null)) {
    const idx = (node.textContent ?? "").indexOf(note.selectedText);
    if (idx === -1) continue;
    try {
      const range = document.createRange();
      range.setStart(node, idx);
      range.setEnd(node, idx + note.selectedText.length);
      const mark = document.createElement("mark");
      mark.dataset.noteId = note.id;
      mark.className = `note-highlight ${note.note ? "note-has-note" : "note-highlight-only"}`;
      range.surroundContents(mark);
    } catch { /* spans multiple nodes */ }
    break;
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

const PostNotes = ({ postSlug, articleRef }: Props) => {
  const [anchor, setAnchor] = useState<SelectionAnchor | null>(null);
  const [creatingNote, setCreatingNote] = useState(false); // anchor + input panel open
  const [noteText, setNoteText] = useState("");
  const [popover, setPopover] = useState<NotePopover | null>(null);
  const [editText, setEditText] = useState("");

  const actionMenuRef = useRef<HTMLDivElement>(null);
  const inputPanelRef = useRef<HTMLDivElement>(null);
  const popoverRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const editareaRef = useRef<HTMLTextAreaElement>(null);
  const addBtnRef = useRef<HTMLButtonElement>(null);

  // Mirror of creatingNote for use inside event handler closures
  const creatingNoteRef = useRef(false);
  useEffect(() => { creatingNoteRef.current = creatingNote; }, [creatingNote]);

  const createNote = useCreateNote(postSlug);
  const updateNote = useUpdateNote(postSlug);
  const deleteNote = useDeleteNote(postSlug);
  const { data: notesData } = useNotes(postSlug);
  const notes = notesData?.notes ?? [];

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

  // ── Detect text selection ────────────────────────────────────────────────
  useEffect(() => {
    const handleMouseUp = (e: MouseEvent) => {
      if (addBtnRef.current?.contains(e.target as Node)) return;
      if (actionMenuRef.current?.contains(e.target as Node)) return;
      if (inputPanelRef.current?.contains(e.target as Node)) return;
      if (popoverRef.current?.contains(e.target as Node)) return;
      if (creatingNoteRef.current) return;

      const sel = window.getSelection();
      if (!sel || sel.isCollapsed) { setAnchor(null); return; }
      const text = sel.toString().trim();
      if (text.length < 3) { setAnchor(null); return; }

      const article = articleRef.current;
      if (!article) return;
      const range = sel.getRangeAt(0);
      if (!article.contains(range.commonAncestorContainer)) { setAnchor(null); return; }

      const rect = range.getBoundingClientRect();
      setAnchor({ text, top: rect.top, bottom: rect.bottom, left: rect.left });
      setPopover(null);
    };

    const handleMouseDown = (e: MouseEvent) => {
      if (actionMenuRef.current?.contains(e.target as Node)) return;
      if (inputPanelRef.current?.contains(e.target as Node)) return;
      if (popoverRef.current?.contains(e.target as Node)) return;
      if ((e.target as HTMLElement).closest("mark[data-note-id]")) return;
      setPopover(null);
    };

    document.addEventListener("mouseup", handleMouseUp);
    document.addEventListener("mousedown", handleMouseDown);
    return () => {
      document.removeEventListener("mouseup", handleMouseUp);
      document.removeEventListener("mousedown", handleMouseDown);
    };
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

  // Create highlight only (no note)
  const handleHighlightOnly = async () => {
    if (!anchor) return;
    try {
      await createNote.mutateAsync({ selectedText: anchor.text, note: null });
      toast.success("Highlighted");
      dismissAnchor();
    } catch { toast.error("Failed to save highlight"); }
  };

  // Create highlight + note
  const handleSaveNew = async () => {
    if (!anchor || !noteText.trim()) return;
    try {
      await createNote.mutateAsync({ selectedText: anchor.text, note: noteText.trim() });
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

  return (
    <>
      {/* ── Action menu: Highlight / Add Note ── */}
      {anchor && !creatingNote && (
        <div
          ref={actionMenuRef}
          style={{ position: "fixed", top: anchorPos!.top, left: anchorPos!.left, zIndex: 50 }}
          className="flex items-center gap-1 rounded-lg border border-border bg-card shadow-xl p-1"
        >
          <button
            onMouseDown={(e) => e.preventDefault()}
            onClick={handleHighlightOnly}
            disabled={createNote.isPending}
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-xs font-medium text-foreground hover:bg-muted transition-colors disabled:opacity-50"
            title="Highlight without a note"
          >
            {createNote.isPending
              ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
              : <Highlighter className="w-3.5 h-3.5 text-amber-500" />}
            Highlight
          </button>

          <div className="w-px h-4 bg-border/60" />

          <button
            ref={addBtnRef}
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => setCreatingNote(true)}
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-xs font-medium text-foreground hover:bg-muted transition-colors"
            title="Highlight and add a note"
          >
            <MessageSquarePlus className="w-3.5 h-3.5 text-primary" />
            Add Note
          </button>

          <button
            onMouseDown={(e) => e.preventDefault()}
            onClick={dismissAnchor}
            className="p-1.5 rounded-md hover:bg-muted transition-colors"
          >
            <X className="w-3 h-3 text-muted-foreground" />
          </button>
        </div>
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
