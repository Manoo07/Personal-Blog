import { useState, useEffect, useRef } from "react";
import { MessageSquarePlus, X, Loader2, Trash2 } from "lucide-react";
import { useCreateNote, useNotes, useDeleteNote } from "@/hooks/use-api";
import type { ApiNote } from "@/lib/api";

interface Props {
  postSlug: string;
  articleRef: React.RefObject<HTMLElement | null>;
}

// Viewport-relative coords (use directly with position:fixed)
interface SelectionAnchor {
  text: string;
  top: number;
  bottom: number;
  left: number;
}

interface NotePopover {
  note: ApiNote;
  top: number;
  left: number;
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
      mark.className = "note-highlight";
      range.surroundContents(mark);
    } catch {
      // selection spans multiple nodes — skip
    }
    break; // first occurrence only
  }
}

// ── Component ─────────────────────────────────────────────────────────────────

const PostNotes = ({ postSlug, articleRef }: Props) => {
  const [anchor, setAnchor] = useState<SelectionAnchor | null>(null);
  const [inputOpen, setInputOpen] = useState(false);
  const [noteText, setNoteText] = useState("");
  const [popover, setPopover] = useState<NotePopover | null>(null);

  const inputPanelRef = useRef<HTMLDivElement>(null);
  const popoverRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const addBtnRef = useRef<HTMLButtonElement>(null);
  // Ref mirror of inputOpen so event-handler closures always read the live value
  const inputOpenRef = useRef(false);

  const createNote = useCreateNote(postSlug);
  const { data: notesData } = useNotes(postSlug);
  const deleteNote = useDeleteNote(postSlug);
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
      // Position popover below the mark, aligned to its left edge
      const panelWidth = 260;
      const left = Math.max(8, Math.min(rect.left, window.innerWidth - panelWidth - 8));
      const top = rect.bottom + 6 + window.scrollY; // absolute for scrolled pages
      setPopover({ note, top, left });
      setAnchor(null);
      setInputOpen(false);
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

  // ── Detect text selection inside article ─────────────────────────────────
  useEffect(() => {
    const handleMouseUp = (e: MouseEvent) => {
      // Ignore events inside our own UI elements (including the "Add note" button)
      if (addBtnRef.current?.contains(e.target as Node)) return;
      if (inputPanelRef.current?.contains(e.target as Node)) return;
      if (popoverRef.current?.contains(e.target as Node)) return;

      // If the input panel is already open don't reset it on every mouseup
      if (inputOpenRef.current) return;

      const sel = window.getSelection();
      if (!sel || sel.isCollapsed) {
        setAnchor(null);
        return;
      }
      const text = sel.toString().trim();
      if (text.length < 3) { setAnchor(null); return; }

      const article = articleRef.current;
      if (!article) return;
      const range = sel.getRangeAt(0);
      if (!article.contains(range.commonAncestorContainer)) {
        setAnchor(null); return;
      }

      const rect = range.getBoundingClientRect();
      setAnchor({ text, top: rect.top, bottom: rect.bottom, left: rect.left });
      setPopover(null);
    };

    const handleMouseDown = (e: MouseEvent) => {
      if (inputPanelRef.current?.contains(e.target as Node)) return;
      if (popoverRef.current?.contains(e.target as Node)) return;
      if ((e.target as HTMLElement).closest("mark[data-note-id]")) return;
      setPopover(null);
      // Don't clear anchor here — let mouseup handle it
    };

    document.addEventListener("mouseup", handleMouseUp);
    document.addEventListener("mousedown", handleMouseDown);
    return () => {
      document.removeEventListener("mouseup", handleMouseUp);
      document.removeEventListener("mousedown", handleMouseDown);
    };
  }, [articleRef]);

  // Keep ref in sync so event handlers always see the live value
  useEffect(() => { inputOpenRef.current = inputOpen; }, [inputOpen]);

  // Focus textarea when input panel opens
  useEffect(() => {
    if (inputOpen) setTimeout(() => textareaRef.current?.focus(), 40);
  }, [inputOpen]);

  const dismiss = () => {
    setAnchor(null);
    setInputOpen(false);
    setNoteText("");
    window.getSelection()?.removeAllRanges();
  };

  const handleSave = async () => {
    if (!anchor || !noteText.trim()) return;
    try {
      await createNote.mutateAsync({ selectedText: anchor.text, note: noteText.trim() });
      dismiss();
    } catch {}
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Escape") dismiss();
    if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) handleSave();
  };

  // ── Layout helpers ────────────────────────────────────────────────────────
  const PANEL_WIDTH = 256;
  const PANEL_HEIGHT = 180;

  function panelPosition(top: number, bottom: number, left: number) {
    const spaceBelow = window.innerHeight - bottom;
    const panelTop = spaceBelow >= PANEL_HEIGHT + 8
      ? bottom + 8      // place below selection
      : top - PANEL_HEIGHT - 8; // place above selection
    const panelLeft = Math.max(8, Math.min(left, window.innerWidth - PANEL_WIDTH - 8));
    return { top: panelTop, left: panelLeft };
  }

  return (
    <>
      {/* ── "Add note" button — appears at bottom-left of selection ── */}
      {anchor && !inputOpen && (
        <button
          ref={addBtnRef}
          onMouseDown={(e) => e.preventDefault()} // keep selection alive
          onClick={() => setInputOpen(true)}
          style={(() => {
            const { top, left } = panelPosition(anchor.top, anchor.bottom, anchor.left);
            return { position: "fixed", top, left };
          })()}
          className="z-50 flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-primary text-primary-foreground text-xs font-medium shadow-lg hover:opacity-90 transition-opacity select-none"
        >
          <MessageSquarePlus className="w-3.5 h-3.5" />
          Add note
        </button>
      )}

      {/* ── Note input panel ── */}
      {anchor && inputOpen && (
        <div
          ref={inputPanelRef}
          style={(() => {
            const { top, left } = panelPosition(anchor.top, anchor.bottom, anchor.left);
            return { position: "fixed", top, left, width: PANEL_WIDTH, zIndex: 50 };
          })()}
          className="rounded-lg border border-border bg-card shadow-xl flex flex-col gap-2 p-3"
        >
          {/* Quoted selected text */}
          <p className="text-[10px] text-muted-foreground italic line-clamp-2 border-l-2 border-primary/50 pl-2 leading-snug">
            "{anchor.text}"
          </p>

          <textarea
            ref={textareaRef}
            value={noteText}
            onChange={(e) => setNoteText(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Write a note…"
            rows={3}
            className="w-full resize-none rounded-md border border-border bg-background px-2.5 py-1.5 text-sm text-foreground placeholder:text-muted-foreground/60 focus:outline-none focus:ring-1 focus:ring-primary"
          />

          <div className="flex items-center justify-between">
            <span className="text-[10px] text-muted-foreground/50">⌘↵ save</span>
            <div className="flex gap-1.5">
              <button
                onClick={dismiss}
                className="p-1.5 rounded hover:bg-muted transition-colors"
              >
                <X className="w-3.5 h-3.5 text-muted-foreground" />
              </button>
              <button
                onClick={handleSave}
                disabled={!noteText.trim() || createNote.isPending}
                className="flex items-center gap-1 px-2.5 py-1 rounded bg-primary text-primary-foreground text-xs font-medium hover:opacity-90 transition-opacity disabled:opacity-50"
              >
                {createNote.isPending && <Loader2 className="w-3 h-3 animate-spin" />}
                Save
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Note detail popover — shown when clicking a highlight ── */}
      {popover && (
        <div
          ref={popoverRef}
          style={{
            position: "absolute",
            top: popover.top,
            left: Math.max(8, Math.min(popover.left, window.innerWidth - PANEL_WIDTH - 8)),
            width: PANEL_WIDTH,
            zIndex: 50,
          }}
          className="rounded-lg border border-border bg-card shadow-xl p-3 flex flex-col gap-2"
        >
          <div className="flex items-start justify-between gap-2">
            <p className="text-[10px] text-muted-foreground italic line-clamp-2 border-l-2 border-primary/50 pl-2 leading-snug flex-1">
              "{popover.note.selectedText}"
            </p>
            <button
              onClick={() => setPopover(null)}
              className="flex-shrink-0 p-0.5 rounded hover:bg-muted transition-colors"
            >
              <X className="w-3.5 h-3.5 text-muted-foreground" />
            </button>
          </div>

          <p className="text-sm text-foreground leading-snug">{popover.note.note}</p>

          <div className="flex items-center justify-between pt-1 border-t border-border/40">
            <span className="text-[10px] text-muted-foreground/50">
              {new Date(popover.note.createdAt).toLocaleDateString("en-US", {
                month: "short", day: "numeric", year: "numeric",
              })}
            </span>
            <button
              onClick={() => deleteNote.mutate(popover.note.id)}
              disabled={deleteNote.isPending}
              className="flex items-center gap-1 text-[10px] text-muted-foreground hover:text-destructive transition-colors disabled:opacity-50"
            >
              {deleteNote.isPending
                ? <Loader2 className="w-3 h-3 animate-spin" />
                : <Trash2 className="w-3 h-3" />}
              Delete
            </button>
          </div>
        </div>
      )}
    </>
  );
};

export default PostNotes;
