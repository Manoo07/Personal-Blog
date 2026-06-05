import { useState, useEffect, useRef, useCallback } from "react";
import { MessageSquarePlus, X, Loader2 } from "lucide-react";
import { useCreateNote } from "@/hooks/use-api";

interface SelectionBubbleProps {
  postSlug: string;
  articleRef: React.RefObject<HTMLElement | null>;
}

interface BubblePosition {
  x: number;
  y: number;
  selectedText: string;
}

const PostNotes = ({ postSlug, articleRef }: SelectionBubbleProps) => {
  const [bubble, setBubble] = useState<BubblePosition | null>(null);
  const [showInput, setShowInput] = useState(false);
  const [noteText, setNoteText] = useState("");
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const popoverRef = useRef<HTMLDivElement>(null);
  const createNote = useCreateNote(postSlug);

  const clearBubble = useCallback(() => {
    setBubble(null);
    setShowInput(false);
    setNoteText("");
  }, []);

  useEffect(() => {
    const handleMouseUp = (e: MouseEvent) => {
      // Ignore clicks inside the popover itself
      if (popoverRef.current?.contains(e.target as Node)) return;

      const selection = window.getSelection();
      if (!selection || selection.isCollapsed) {
        // Don't clear if the popover is open — let the user type
        if (!showInput) clearBubble();
        return;
      }

      const selectedText = selection.toString().trim();
      if (!selectedText || selectedText.length < 3) {
        if (!showInput) clearBubble();
        return;
      }

      // Only react to selections inside the article
      const article = articleRef.current;
      if (!article) return;
      const range = selection.getRangeAt(0);
      if (!article.contains(range.commonAncestorContainer)) {
        if (!showInput) clearBubble();
        return;
      }

      const rect = range.getBoundingClientRect();
      setBubble({
        x: rect.right + window.scrollX,
        y: rect.top + window.scrollY - 8,
        selectedText,
      });
      setShowInput(false);
    };

    // Close popover when clicking outside
    const handleMouseDown = (e: MouseEvent) => {
      if (popoverRef.current && !popoverRef.current.contains(e.target as Node)) {
        const selection = window.getSelection();
        // If user is starting a new selection inside article, don't clear yet
        const article = articleRef.current;
        if (article?.contains(e.target as Node) && selection && !selection.isCollapsed) return;
        clearBubble();
      }
    };

    document.addEventListener("mouseup", handleMouseUp);
    document.addEventListener("mousedown", handleMouseDown);
    return () => {
      document.removeEventListener("mouseup", handleMouseUp);
      document.removeEventListener("mousedown", handleMouseDown);
    };
  }, [showInput, clearBubble, articleRef]);

  // Focus textarea when popover opens
  useEffect(() => {
    if (showInput) {
      setTimeout(() => textareaRef.current?.focus(), 50);
    }
  }, [showInput]);

  const handleSave = async () => {
    if (!bubble || !noteText.trim()) return;
    try {
      await createNote.mutateAsync({
        selectedText: bubble.selectedText,
        note: noteText.trim(),
      });
      // Clear selection highlight
      window.getSelection()?.removeAllRanges();
      clearBubble();
    } catch {
      // error surfaced via mutation state
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Escape") clearBubble();
    if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) handleSave();
  };

  if (!bubble) return null;

  return (
    <>
      {/* Floating "+" button anchored to end of selection */}
      {!showInput && (
        <button
          onMouseDown={(e) => e.preventDefault()} // keep selection alive
          onClick={() => setShowInput(true)}
          style={{ left: bubble.x + 6, top: bubble.y }}
          className="fixed z-50 flex items-center justify-center w-7 h-7 rounded-full bg-primary text-primary-foreground shadow-md hover:opacity-90 transition-opacity"
          aria-label="Add note"
        >
          <MessageSquarePlus className="w-3.5 h-3.5" />
        </button>
      )}

      {/* Note input popover */}
      {showInput && (
        <div
          ref={popoverRef}
          style={{
            left: Math.min(bubble.x + 6, window.innerWidth - 260),
            top: bubble.y,
          }}
          className="fixed z-50 w-60 rounded-lg border border-border bg-card shadow-lg p-3 flex flex-col gap-2"
        >
          {/* Selected text preview */}
          <p className="text-[10px] text-muted-foreground italic line-clamp-2 border-l-2 border-primary/40 pl-2">
            "{bubble.selectedText}"
          </p>

          <textarea
            ref={textareaRef}
            value={noteText}
            onChange={(e) => setNoteText(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Add your note…"
            rows={3}
            className="w-full resize-none rounded-md border border-border bg-background px-2.5 py-1.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary"
          />

          <div className="flex items-center justify-between gap-2">
            <span className="text-[10px] text-muted-foreground">⌘↵ to save</span>
            <div className="flex gap-1.5">
              <button
                onClick={clearBubble}
                className="p-1 rounded hover:bg-muted transition-colors"
                aria-label="Cancel"
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
    </>
  );
};

export default PostNotes;
