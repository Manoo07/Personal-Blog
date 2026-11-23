import { useEffect, useState, useCallback, useRef, useMemo } from "react";
import { Link } from "react-router-dom";
import { Search, X, ChevronRight, StickyNote, Highlighter, MessageSquare, ChevronsDownUp, ChevronsUpDown, PanelRightClose } from "lucide-react";
import { cn } from "@/lib/utils";
import { useNotes, usePosts } from "@/hooks/use-api";
import { scrollToHighlight } from "@/components/PostNotes";

/**
 * Obsidian-style right pane: search box + document outline (+ the user's notes).
 */

interface Heading {
  id: string;
  text: string;
  level: number;
}

interface OutlineNode extends Heading {
  children: OutlineNode[];
}

interface BlogSidebarProps {
  content: string;
  postSlug?: string;
  isLoggedIn?: boolean;
  /** Desktop (lg+) pane visible */
  open: boolean;
  onClose: () => void;
  /** Below lg: drawer visible */
  mobileOpen: boolean;
  onMobileClose: () => void;
}

/** Outline-wide collapse/expand broadcast (n bumps so repeats fire). */
type OutlineCommand = { type: "collapse" | "expand"; n: number };

/** Build a nested tree from a flat list of headings (like Obsidian's Outline). */
function buildTree(headings: Heading[]): OutlineNode[] {
  const root: OutlineNode[] = [];
  const stack: OutlineNode[] = [];
  for (const h of headings) {
    const node: OutlineNode = { ...h, children: [] };
    while (stack.length && stack[stack.length - 1].level >= h.level) stack.pop();
    if (stack.length) stack[stack.length - 1].children.push(node);
    else root.push(node);
    stack.push(node);
  }
  return root;
}

const ROW =
  "relative w-full text-left pl-[24px] pr-2 py-[3px] rounded-[4px] text-[13px] leading-[1.35] transition-colors duration-100";

interface OutlineItemProps {
  node: OutlineNode;
  activeId: string;
  onSelect: (id: string) => void;
  command: OutlineCommand;
  depth: number;
}

const OutlineItem = ({ node, activeId, onSelect, command, depth }: OutlineItemProps) => {
  const [open, setOpen] = useState(true);
  const hasChildren = node.children.length > 0;

  // Header "collapse all / expand all"
  useEffect(() => {
    if (command.n === 0) return;
    setOpen(command.type === "expand");
     
  }, [command]);

  return (
    <li>
      <div className="relative">
        {hasChildren && (
          <button
            type="button"
            onClick={() => setOpen((o) => !o)}
            className="absolute left-[4px] top-[3px] z-10 p-[1px] rounded text-muted-foreground hover:text-foreground"
            aria-label={open ? "Collapse" : "Expand"}
          >
            <ChevronRight className={cn("w-[14px] h-[14px] transition-transform duration-100", open && "rotate-90")} />
          </button>
        )}
        <button
          type="button"
          onClick={() => onSelect(node.id)}
          data-active={activeId === node.id ? "true" : undefined}
          className={cn(
            ROW,
            activeId === node.id
              ? "text-primary"
              : "text-foreground/80 hover:bg-accent/50 hover:text-foreground"
          )}
        >
          {node.text}
        </button>
      </div>
      {hasChildren && open && (
        <ul className="ml-[13px] border-l border-border">
          {node.children.map((c) => (
            <OutlineItem key={c.id} node={c} activeId={activeId} onSelect={onSelect} command={command} depth={depth + 1} />
          ))}
        </ul>
      )}
    </li>
  );
};

const IconBtn = ({ label, onClick, children }: { label: string; onClick: () => void; children: React.ReactNode }) => (
  <button
    type="button"
    onClick={onClick}
    title={label}
    aria-label={label}
    className="p-1.5 rounded-[4px] text-muted-foreground hover:text-foreground hover:bg-accent/60 transition-colors"
  >
    {children}
  </button>
);

const BlogSidebar = ({ content, postSlug, isLoggedIn, open, onClose, mobileOpen, onMobileClose }: BlogSidebarProps) => {
  const [command, setCommand] = useState<OutlineCommand>({ type: "expand", n: 0 });
  const [allCollapsed, setAllCollapsed] = useState(false);
  const searchRef = useRef<HTMLInputElement>(null);
  const [headings, setHeadings] = useState<Heading[]>([]);
  const [activeId, setActiveId] = useState("");
  const [query, setQuery] = useState("");
  const [showNotes, setShowNotes] = useState(true);
  const outlineRef = useRef<HTMLDivElement>(null);

  const { data: notesData } = useNotes(postSlug ?? "");
  const notes = notesData?.notes ?? [];

  // Same query key as the Blog page so it's usually already cached
  const { data: postsData } = usePosts({ limit: 100, sort: "order", order: "asc" });

  // ── Parse headings from the rendered article ──
  const parseHeadings = useCallback(() => {
    const article = document.querySelector("article .prose");
    if (!article) return;
    const found: Heading[] = [];
    article.querySelectorAll("h1, h2, h3, h4, h5, h6").forEach((el, i) => {
      const text = (el.textContent || "").trim();
      if (!text) return; // ignore empty headings such as a stray "# "
      const slug = text.toLowerCase().replace(/[^a-z0-9\s-]/g, "").replace(/\s+/g, "-").replace(/-+/g, "-");
      const id = `heading-${slug}-${i}`;
      el.id = id;
      found.push({ id, text, level: parseInt(el.tagName[1]) });
    });
    setHeadings(found);
    if (found.length) setActiveId(found[0].id);

    // Deep link (#heading-…) from "Copy link to section": jump once ids exist
    const hash = decodeURIComponent(window.location.hash.slice(1));
    const target = hash ? document.getElementById(hash) : null;
    if (target) {
      window.scrollTo({ top: target.getBoundingClientRect().top + window.scrollY - 100 });
      setActiveId(hash);
    }
  }, []);

  useEffect(() => {
    const t = setTimeout(parseHeadings, 150);
    return () => clearTimeout(t);
  }, [content, parseHeadings]);

  const tree = useMemo(() => buildTree(headings), [headings]);

  // ── Track the heading being read ──
  useEffect(() => {
    if (!headings.length) return;
    const onScroll = () => {
      let current = headings[0].id;
      for (const h of headings) {
        const el = document.getElementById(h.id);
        if (el && el.getBoundingClientRect().top <= 130) current = h.id;
      }
      setActiveId((prev) => (prev !== current ? current : prev));
    };
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, [headings]);

  // ── Keep the active outline row in view ──
  useEffect(() => {
    const container = outlineRef.current;
    const el = container?.querySelector<HTMLElement>('[data-active="true"]');
    if (!container || !el) return;
    const cRect = container.getBoundingClientRect();
    const eRect = el.getBoundingClientRect();
    if (eRect.top < cRect.top || eRect.bottom > cRect.bottom) {
      container.scrollTo({
        top: container.scrollTop + (eRect.top - cRect.top) - container.clientHeight / 2,
        behavior: "smooth",
      });
    }
  }, [activeId]);

  const handleSelect = (id: string) => {
    const el = document.getElementById(id);
    if (!el) return;
    window.scrollTo({ top: el.getBoundingClientRect().top + window.scrollY - 100, behavior: "smooth" });
    setActiveId(id);
    if (mobileOpen) onMobileClose();
  };

  // ── Search over post titles / tags ──
  const results = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return [];
    return (postsData?.posts ?? [])
      .filter((p) => p.title.toLowerCase().includes(q) || p.tags.some((t) => t.toLowerCase().includes(q)))
      .slice(0, 30);
  }, [query, postsData]);

  const searching = query.trim().length > 0;

  const toggleAll = () => {
    setCommand((c) => ({ type: allCollapsed ? "expand" : "collapse", n: c.n + 1 }));
    setAllCollapsed((v) => !v);
  };

  return (
    <>
    {mobileOpen && <div className="lg:hidden fixed inset-0 z-[55] bg-foreground/20" onClick={onMobileClose} />}
    <aside
      aria-hidden={!open && !mobileOpen}
      className={cn(
        "fixed right-0 top-[49px] bottom-0 w-[300px] max-w-[85vw] bg-secondary border-l border-border flex-col",
        "transition-transform duration-200 ease-out",
        mobileOpen ? "flex z-[60] shadow-xl lg:shadow-none lg:z-30" : "hidden lg:flex z-30",
        !open && !mobileOpen && "lg:translate-x-full lg:invisible"
      )}
    >
      {/* Pane header */}
      <div className="shrink-0 flex items-center justify-center gap-1 h-10 px-2">
        <IconBtn label="Search posts" onClick={() => searchRef.current?.focus()}>
          <Search className="w-[18px] h-[18px]" strokeWidth={1.75} />
        </IconBtn>
        <IconBtn label={allCollapsed ? "Expand all headings" : "Collapse all headings"} onClick={toggleAll}>
          {allCollapsed ? (
            <ChevronsUpDown className="w-[18px] h-[18px]" strokeWidth={1.75} />
          ) : (
            <ChevronsDownUp className="w-[18px] h-[18px]" strokeWidth={1.75} />
          )}
        </IconBtn>
        <IconBtn
          label={mobileOpen ? "Close" : "Collapse right sidebar"}
          onClick={mobileOpen ? onMobileClose : onClose}
        >
          {mobileOpen ? (
            <X className="w-[18px] h-[18px]" strokeWidth={1.75} />
          ) : (
            <PanelRightClose className="w-[18px] h-[18px]" strokeWidth={1.75} />
          )}
        </IconBtn>
      </div>

      {/* Search */}
      <div className="shrink-0 px-2.5 pb-1.5">
        <label className="relative flex items-center">
          <Search className="absolute left-2.5 w-4 h-4 text-muted-foreground pointer-events-none" />
          <input
            ref={searchRef}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => e.key === "Escape" && setQuery("")}
            placeholder="Search..."
            className="w-full h-[28px] pl-8 pr-7 rounded-full bg-[hsl(0_0%_96%)] border border-input/60 text-[13px] text-foreground placeholder:text-muted-foreground outline-none focus:border-input focus:ring-2 focus:ring-input/20 transition-shadow"
          />
          {searching && (
            <button
              type="button"
              onClick={() => setQuery("")}
              className="absolute right-2 p-0.5 rounded text-muted-foreground hover:text-foreground"
              aria-label="Clear search"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </label>
      </div>

      {/* Search results OR outline */}
      <div ref={outlineRef} className="flex-1 min-h-0 overflow-y-auto scrollbar-thin px-2.5 pb-4">
        {searching ? (
          results.length === 0 ? (
            <p className="px-2 pt-3 text-[13px] text-muted-foreground">No matches found.</p>
          ) : (
            <ul>
              {results.map((p) => (
                <li key={p.slug}>
                  <Link
                    to={`/blog/${p.slug}`}
                    onClick={() => setQuery("")}
                    className={cn(
                      "block px-2 py-[3px] rounded-[4px] hover:bg-accent/60 transition-colors",
                      p.slug === postSlug && "bg-accent"
                    )}
                  >
                    <span className="block text-[13px] leading-[1.35] text-foreground">{p.title}</span>
                    {p.section && (
                      <span className="block text-[11.5px] text-muted-foreground mt-0.5">{p.section.name}</span>
                    )}
                  </Link>
                </li>
              ))}
            </ul>
          )
        ) : tree.length === 0 ? (
          <p className="px-2 pt-3 text-[13px] text-muted-foreground">No headings found.</p>
        ) : (
          <ul className="pt-1">
            {tree.map((n) => (
              <OutlineItem key={n.id} node={n} activeId={activeId} onSelect={handleSelect} command={command} depth={0} />
            ))}
          </ul>
        )}
      </div>

      {/* My notes (logged-in only) */}
      {isLoggedIn && postSlug && (
        <div className="shrink-0 border-t border-border max-h-[40%] flex flex-col pb-9">
          <button
            type="button"
            onClick={() => setShowNotes((v) => !v)}
            className="shrink-0 flex items-center gap-2 h-10 px-4 text-[13px] text-foreground/85 hover:text-foreground"
          >
            <ChevronRight className={cn("w-[14px] h-[14px] text-muted-foreground transition-transform", showNotes && "rotate-90")} />
            <StickyNote className="w-3.5 h-3.5 text-muted-foreground" />
            <span className="font-medium">My notes</span>
            {notes.length > 0 && (
              <span className="ml-auto text-[11px] px-1.5 rounded-full bg-tag text-primary tabular-nums">
                {notes.length}
              </span>
            )}
          </button>
          {showNotes && (
            <div className="min-h-0 overflow-y-auto scrollbar-thin px-2.5 pb-3 space-y-1.5">
              {notes.length === 0 ? (
                <p className="px-2 text-[12px] text-muted-foreground">Select text and right-click to highlight it or add a note.</p>
              ) : (
                notes.map((n) => (
                  <button
                    key={n.id}
                    type="button"
                    onClick={() => scrollToHighlight(n.id)}
                    className="w-full text-left rounded-[4px] px-2 py-1.5 hover:bg-accent/60 transition-colors space-y-1"
                  >
                    <p className="text-[12px] text-muted-foreground italic line-clamp-2 border-l-2 border-primary/60 pl-2">
                      {n.selectedText}
                    </p>
                    {n.note ? (
                      <p className="text-[12.5px] text-foreground line-clamp-2 flex gap-1.5">
                        <MessageSquare className="w-3 h-3 mt-0.5 shrink-0 text-muted-foreground" />
                        {n.note}
                      </p>
                    ) : (
                      <p className="text-[11px] text-muted-foreground flex items-center gap-1">
                        <Highlighter className="w-3 h-3" /> Highlight only
                      </p>
                    )}
                  </button>
                ))
              )}
            </div>
          )}
        </div>
      )}
    </aside>
    </>
  );
};

export default BlogSidebar;
