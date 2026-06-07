import { useEffect, useState, useCallback, useRef } from "react";
import { StickyNote, Highlighter, MessageSquare, ArrowRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { useNotes } from "@/hooks/use-api";
import { scrollToHighlight } from "@/components/PostNotes";

interface Heading {
  id: string;
  text: string;
  level: number;
}

interface BlogSidebarProps {
  content: string;
  postSlug?: string;
  isLoggedIn?: boolean;
}

const BlogSidebar = ({ content, postSlug, isLoggedIn }: BlogSidebarProps) => {
  const [headings, setHeadings] = useState<Heading[]>([]);
  const [activeId, setActiveId] = useState<string>("");
  const [showNotes, setShowNotes] = useState(false);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const itemRefs = useRef<Map<string, HTMLElement>>(new Map());

  const { data: notesData } = useNotes(postSlug ?? "");
  const notes = notesData?.notes ?? [];

  // Parse headings from rendered markdown content
  const parseHeadings = useCallback(() => {
    const article = document.querySelector("article .prose");
    if (!article) return;

    const headingElements = article.querySelectorAll("h2, h3, h4");
    const headingData: Heading[] = [];

    headingElements.forEach((heading, index) => {
      const text = heading.textContent || "";
      const slug = text
        .toLowerCase()
        .replace(/[^a-z0-9\s-]/g, "")
        .replace(/\s+/g, "-")
        .replace(/-+/g, "-")
        .trim();

      const id = `heading-${slug}-${index}`;
      heading.id = id;

      headingData.push({ id, text, level: parseInt(heading.tagName[1]) });
    });

    setHeadings(headingData);
    if (headingData.length > 0) {
      setActiveId(headingData[0].id);
    }
  }, []);

  useEffect(() => {
    const timer = setTimeout(parseHeadings, 150);
    return () => clearTimeout(timer);
  }, [content, parseHeadings]);

  // ─── Track which heading the user is reading ───
  useEffect(() => {
    if (headings.length === 0) return;

    const handleScroll = () => {
      const scrollY = window.scrollY;
      let current = headings[0]?.id ?? "";

      for (const h of headings) {
        const el = document.getElementById(h.id);
        if (el && el.getBoundingClientRect().top + window.scrollY <= scrollY + 130) {
          current = h.id;
        }
      }

      setActiveId((prev) => (prev !== current ? current : prev));
    };

    handleScroll();
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, [headings]);

  // ─── Auto-scroll the TOC panel to keep the active item centred ───
  useEffect(() => {
    const container = scrollContainerRef.current;
    const activeItem = itemRefs.current.get(activeId);
    if (!container || !activeItem) return;

    const containerH = container.clientHeight;
    const itemTop = activeItem.offsetTop;
    const itemH = activeItem.clientHeight;

    container.scrollTo({
      top: Math.max(0, itemTop - containerH / 2 + itemH / 2),
      behavior: "smooth",
    });
  }, [activeId]);

  const handleClick = (id: string) => {
    const el = document.getElementById(id);
    if (el) {
      window.scrollTo({
        top: el.getBoundingClientRect().top + window.scrollY - 100,
        behavior: "smooth",
      });
      setActiveId(id);
    }
  };

  if (headings.length === 0 && (!isLoggedIn || notes.length === 0)) return null;

  // Group headings under their parent h2
  const groups: { parent: Heading; children: Heading[] }[] = [];
  let cur: (typeof groups)[number] | null = null;

  headings.forEach((h) => {
    if (h.level === 2) {
      if (cur) groups.push(cur);
      cur = { parent: h, children: [] };
    } else if (cur) {
      cur.children.push(h);
    }
  });
  if (cur) groups.push(cur);

  const isActiveInGroup = (g: (typeof groups)[number]) =>
    g.parent.id === activeId || g.children.some((c) => c.id === activeId);

  return (
    <aside className="hidden lg:block">
      <nav className="fixed top-24 right-4 xl:right-8 w-48 xl:w-56 flex flex-col gap-2 max-h-[calc(100vh-7rem)] overflow-hidden">
        <div className="rounded-lg border border-border/40 bg-card/50 backdrop-blur-sm flex flex-col min-h-0 flex-1">
          <div className="px-3 pt-3 pb-1.5 flex-shrink-0">
            <h4 className="text-[9px] font-semibold text-muted-foreground uppercase tracking-wider">
              Table of Contents
            </h4>
          </div>

          {/* ── scrollable list ── */}
          <div
            ref={scrollContainerRef}
            className="flex-1 min-h-0 overflow-y-auto scroll-smooth px-3 pb-3 scrollbar-thin scrollbar-thumb-border scrollbar-track-transparent"
          >
            <ul className="space-y-0.5 text-[11px]">
              {groups.map((group, gi) => (
                <li
                  key={group.parent.id}
                  ref={(el) => {
                    if (el) itemRefs.current.set(group.parent.id, el);
                  }}
                >
                  {/* h2 heading */}
                  <button
                    onClick={() => handleClick(group.parent.id)}
                    className={cn(
                      "text-left w-full py-1 px-1.5 rounded transition-all duration-200 flex items-start gap-1",
                      "hover:text-primary",
                      activeId === group.parent.id
                        ? "text-primary font-semibold bg-primary/8"
                        : "text-foreground/65 hover:text-foreground/90"
                    )}
                  >
                    <span className="text-[10px] text-foreground/35 w-4 flex-shrink-0">
                      {gi + 1}.
                    </span>
                    <span className="line-clamp-2 leading-snug">{group.parent.text}</span>
                  </button>

                  {/* h3 / h4 children */}
                  {group.children.length > 0 && (
                    <ul
                      className={cn(
                        "ml-3 mt-0.5 space-y-0 border-l pl-2 transition-all duration-200",
                        isActiveInGroup(group)
                          ? "border-primary/50"
                          : "border-border/50"
                      )}
                    >
                      {group.children.map((child) => (
                        <li
                          key={child.id}
                          ref={(el) => {
                            if (el) itemRefs.current.set(child.id, el);
                          }}
                        >
                          <button
                            onClick={() => handleClick(child.id)}
                            className={cn(
                              "text-left w-full py-0.5 px-1 rounded transition-all duration-200 text-[10px]",
                              "hover:text-primary",
                              child.level === 4 && "pl-2",
                              activeId === child.id
                                ? "text-primary font-semibold bg-primary/8"
                                : "text-foreground/55 hover:text-foreground/85"
                            )}
                          >
                            <span className="line-clamp-1 leading-snug">{child.text}</span>
                          </button>
                        </li>
                      ))}
                    </ul>
                  )}
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* ── My Notes panel (logged-in users only) ── */}
        {isLoggedIn && postSlug && (
          <div className="rounded-lg border border-border/40 bg-card/50 backdrop-blur-sm flex-shrink-0">
            <button
              onClick={() => setShowNotes((v) => !v)}
              className="w-full flex items-center justify-between px-3 py-2.5 text-left hover:bg-muted/30 rounded-lg transition-colors"
            >
              <div className="flex items-center gap-1.5">
                <StickyNote className="w-3 h-3 text-muted-foreground" />
                <span className="text-[9px] font-semibold text-muted-foreground uppercase tracking-wider">
                  My Notes
                </span>
              </div>
              {notes.length > 0 && (
                <span className="text-[9px] font-medium bg-amber-400/20 text-amber-600 dark:text-amber-400 px-1.5 py-0.5 rounded-full">
                  {notes.length}
                </span>
              )}
            </button>

            {showNotes && (
              <div className="px-2 pb-2.5 space-y-1.5 max-h-52 overflow-y-auto scrollbar-thin scrollbar-thumb-border scrollbar-track-transparent">
                {notes.length === 0 ? (
                  <p className="text-[10px] text-muted-foreground/60 italic text-center py-3">
                    Select any text to highlight or add a note
                  </p>
                ) : (
                  notes.map((n) => (
                    <button
                      key={n.id}
                      onClick={() => scrollToHighlight(n.id)}
                      className="group w-full text-left rounded-md border border-border/30 bg-background/60 p-2 text-[11px] space-y-1 hover:border-amber-400/50 hover:bg-amber-400/5 transition-colors"
                    >
                      {/* Quoted text */}
                      <p className="text-muted-foreground/70 italic line-clamp-2 border-l-2 border-amber-400/50 pl-1.5 leading-snug">
                        "{n.selectedText}"
                      </p>

                      {/* Note body or "Highlight only" badge */}
                      {n.note ? (
                        <p className="text-foreground leading-snug line-clamp-2">{n.note}</p>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-[9px] text-amber-600 dark:text-amber-400 bg-amber-400/10 px-1.5 py-0.5 rounded-full">
                          <Highlighter className="w-2.5 h-2.5" /> Highlight only
                        </span>
                      )}

                      {/* Footer */}
                      <div className="flex items-center justify-between pt-0.5">
                        <div className="flex items-center gap-1 text-[9px] text-muted-foreground/50">
                          {n.note
                            ? <MessageSquare className="w-2.5 h-2.5" />
                            : <Highlighter className="w-2.5 h-2.5" />}
                          {new Date(n.createdAt).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                        </div>
                        <ArrowRight className="w-3 h-3 text-muted-foreground/30 group-hover:text-amber-500 transition-colors" />
                      </div>
                    </button>
                  ))
                )}
              </div>
            )}
          </div>
        )}
      </nav>
    </aside>
  );
};

export default BlogSidebar;
