import { useMemo, useState, useEffect, useRef, useCallback } from "react";
import { Link, useParams, useLocation } from "react-router-dom";
import { cn } from "@/lib/utils";
import { useSectionTree, useUserProgress } from "@/hooks/use-api";
import { ChevronRight, Loader2, X, Check, ChevronsUpDown, ChevronsDownUp, Crosshair, PanelLeftClose } from "lucide-react";
import type { ApiSectionNode, SectionSummary } from "@/lib/api";
import { sortSections } from "@/lib/sections";
import { useSiteConfig } from "@/hooks/use-site-config";

/**
 * Obsidian-style file explorer (left pane).
 *
 * Geometry mirrors Obsidian's nav tree: 13px items, a chevron that sits
 * left of the folder name, and a 1px indentation guide under each open
 * folder aligned with that folder's chevron.
 */

interface SectionNavProps {
  section?: SectionSummary | null;
  /** Desktop (xl+) pane visible */
  open: boolean;
  /** Collapse the desktop pane */
  onClose: () => void;
  /** Below xl: drawer visible */
  mobileOpen: boolean;
  onMobileClose: () => void;
}

/** Tree-wide command broadcast to every folder (n bumps so repeats fire). */
type TreeCommand = { type: "collapse" | "expand" | "reveal"; n: number };

/** Collect every section ID in a subtree (inclusive). */
function collectIds(node: ApiSectionNode): string[] {
  return [node.id, ...(node.children ?? []).flatMap(collectIds)];
}

const ROW =
  "relative flex items-center w-full min-w-0 h-[25px] pl-[24px] pr-2 rounded-[4px] text-[13px] leading-none text-left transition-colors duration-100";

// ── Recursive folder ────────────────────────────────────────────────────

interface FolderProps {
  node: ApiSectionNode;
  currentSlug?: string;
  activeSectionId?: string | null;
  completedSlugs: Set<string>;
  command: TreeCommand;
}

const Folder = ({ node, currentSlug, activeSectionId, completedSlugs, command }: FolderProps) => {
  const allIds = useMemo(() => collectIds(node), [node]);
  const containsActive = activeSectionId != null && allIds.includes(activeSectionId);
  const [open, setOpen] = useState(containsActive);

  // Open (never force-close) when navigating into this subtree
  useEffect(() => {
    if (containsActive) setOpen(true);
  }, [containsActive]);

  // Header actions: collapse all / expand all / reveal active file
  useEffect(() => {
    if (command.n === 0) return;
    if (command.type === "collapse") setOpen(false);
    else if (command.type === "expand") setOpen(true);
    else if (command.type === "reveal" && containsActive) setOpen(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [command]);

  const posts = node.posts ?? [];
  const children = node.children ?? [];
  if (posts.length === 0 && children.length === 0) return null;

  return (
    <li>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        title={node.name}
        className={cn(ROW, "text-foreground/85 hover:bg-accent/60 hover:text-foreground")}
      >
        <ChevronRight
          className={cn(
            "absolute left-[6px] w-[14px] h-[14px] text-muted-foreground transition-transform duration-100",
            open && "rotate-90"
          )}
          strokeWidth={2}
        />
        <span className="truncate">{node.name}</span>
      </button>

      {open && (
        <ul className="ml-[13px] border-l border-border pl-0">
          {sortSections(children).map((child) => (
            <Folder
              key={child.id}
              node={child}
              currentSlug={currentSlug}
              activeSectionId={activeSectionId}
              completedSlugs={completedSlugs}
              command={command}
            />
          ))}
          {posts.map((post) => {
            const isActive = post.slug === currentSlug;
            const isDone = completedSlugs.has(post.slug);
            return (
              <li key={post.slug}>
                <Link
                  to={`/blog/${post.slug}`}
                  data-active={isActive ? "true" : undefined}
                  title={post.title}
                  className={cn(
                    ROW,
                    isActive
                      ? "bg-accent text-foreground"
                      : "text-foreground/85 hover:bg-accent/60 hover:text-foreground"
                  )}
                >
                  <span className="truncate flex-1">{post.title}</span>
                  {isDone && (
                    <Check className="ml-1.5 w-3 h-3 shrink-0 text-primary" strokeWidth={2.5} aria-label="Completed" />
                  )}
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </li>
  );
};

// ── Main ─────────────────────────────────────────────────────────────────

const IconBtn = ({
  label,
  onClick,
  children,
}: {
  label: string;
  onClick: () => void;
  children: React.ReactNode;
}) => (
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

const SectionNav = ({ section, open, onClose, mobileOpen, onMobileClose }: SectionNavProps) => {
  const { slug: currentSlug } = useParams<{ slug: string }>();
  const location = useLocation();
  const { data: sectionData, isLoading } = useSectionTree();
  const { data: progressData } = useUserProgress();
  const libraryName = useSiteConfig().site.libraryName;

  const completedSlugs = useMemo(
    () => new Set((progressData?.completed ?? []).map((c) => c.postSlug)),
    [progressData]
  );

  const [command, setCommand] = useState<TreeCommand>({ type: "reveal", n: 0 });
  const [allCollapsed, setAllCollapsed] = useState(false);
  const desktopRef = useRef<HTMLDivElement>(null);
  const mobileRef = useRef<HTMLDivElement>(null);

  const sections = useMemo(() => sortSections(sectionData?.sections ?? []), [sectionData]);

  // Close the drawer on navigation
  useEffect(() => {
    onMobileClose();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location.pathname]);

  useEffect(() => {
    document.body.style.overflow = mobileOpen ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [mobileOpen]);

  // Keep the active file in view
  const scrollToActive = useCallback((container: HTMLDivElement | null) => {
    if (!container) return;
    setTimeout(() => {
      const el = container.querySelector<HTMLElement>('[data-active="true"]');
      if (!el) return;
      const top = el.getBoundingClientRect().top - container.getBoundingClientRect().top + container.scrollTop;
      container.scrollTo({ top: Math.max(0, top - container.clientHeight / 2), behavior: "smooth" });
    }, 250);
  }, []);

  useEffect(() => scrollToActive(desktopRef.current), [currentSlug, sections, open, scrollToActive]);
  useEffect(() => {
    if (mobileOpen) scrollToActive(mobileRef.current);
  }, [mobileOpen, currentSlug, sections, scrollToActive]);

  if (!isLoading && sections.length === 0) return null;

  const toggleAll = () => {
    setCommand((c) => ({ type: allCollapsed ? "expand" : "collapse", n: c.n + 1 }));
    setAllCollapsed((v) => !v);
  };

  const reveal = () => {
    setCommand((c) => ({ type: "reveal", n: c.n + 1 }));
    setAllCollapsed(false);
    scrollToActive(desktopRef.current);
    scrollToActive(mobileRef.current);
  };

  const header = (closeLabel: string, onCloseClick: () => void, CloseIcon: typeof X) => (
    <div className="shrink-0 flex items-center justify-center gap-1 h-10 px-2">
      <IconBtn label={allCollapsed ? "Expand all" : "Collapse all"} onClick={toggleAll}>
        {allCollapsed ? <ChevronsUpDown className="w-[18px] h-[18px]" strokeWidth={1.75} /> : <ChevronsDownUp className="w-[18px] h-[18px]" strokeWidth={1.75} />}
      </IconBtn>
      <IconBtn label="Reveal active file" onClick={reveal}>
        <Crosshair className="w-[18px] h-[18px]" strokeWidth={1.75} />
      </IconBtn>
      <IconBtn label={closeLabel} onClick={onCloseClick}>
        <CloseIcon className="w-[18px] h-[18px]" strokeWidth={1.75} />
      </IconBtn>
    </div>
  );

  const tree = (ref: React.RefObject<HTMLDivElement>) => (
    <div ref={ref} className="flex-1 min-h-0 overflow-y-auto scrollbar-thin px-2.5 pt-0.5 pb-4">
      {isLoading ? (
        <div className="py-6 flex justify-center">
          <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
        </div>
      ) : (
        <ul>
          {sections.map((node) => (
            <Folder
              key={node.id}
              node={node}
              currentSlug={currentSlug}
              activeSectionId={section?.id ?? null}
              completedSlugs={completedSlugs}
              command={command}
            />
          ))}
        </ul>
      )}
    </div>
  );

  const vaultFooter = (
    <Link
      to="/blog"
      className="shrink-0 flex items-center gap-2 h-10 px-4 border-t border-border text-[14px] font-semibold text-foreground hover:bg-accent/50 transition-colors"
    >
      <ChevronsUpDown className="w-4 h-4 text-muted-foreground" />
      {libraryName}
    </Link>
  );

  return (
    <>
      {/* Drawer (below xl) */}
      {mobileOpen && (
        <div className="xl:hidden fixed inset-0 z-[60]">
          <div className="absolute inset-0 bg-foreground/20" onClick={onMobileClose} />
          <nav className="absolute inset-y-0 left-0 w-[300px] max-w-[85vw] bg-secondary border-r border-border shadow-xl animate-in slide-in-from-left duration-200 flex flex-col">
            {header("Close", onMobileClose, X)}
            {tree(mobileRef)}
            {vaultFooter}
          </nav>
        </div>
      )}

      {/* Desktop pane (xl+) — slides out when collapsed */}
      <aside
        aria-hidden={!open}
        className={cn(
          "hidden xl:flex flex-col fixed left-0 top-[49px] bottom-0 w-[300px] bg-secondary border-r border-border z-30",
          "transition-transform duration-200 ease-out",
          !open && "-translate-x-full invisible"
        )}
      >
        {header("Collapse left sidebar", onClose, PanelLeftClose)}
        {tree(desktopRef)}
        {vaultFooter}
      </aside>
    </>
  );
};

export default SectionNav;
