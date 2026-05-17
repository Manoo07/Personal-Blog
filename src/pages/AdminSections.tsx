import { useState, useMemo, useRef, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import Layout from "@/components/Layout";
import Breadcrumb from "@/components/Breadcrumb";
import {
  Plus,
  Pencil,
  Trash2,
  ChevronRight,
  ChevronDown,
  ChevronUp,
  FolderOpen,
  Folder,
  Loader2,
  Check,
  X,
  LogOut,
  FolderTree,
  BookOpen,
  FileText,
  Search,
  Link2,
  Link2Off,
  GripVertical,
  CornerUpLeft,
  BarChart2,
} from "lucide-react";
import {
  useVerifyToken,
  useLogout,
  useSectionTree,
  useCreateSection,
  useUpdateSection,
  useDeleteSection,
  useReorderSections,
  useAdminPosts,
  useUpdatePost,
} from "@/hooks/use-api";
import { getToken } from "@/lib/api";
import type { ApiSectionNode, ApiPostSummary } from "@/lib/api";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";

// ── helpers ───────────────────────────────────────────────────────────────

function slugify(name: string): string {
  return name
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-");
}

function findNodeInTree(
  nodes: ApiSectionNode[],
  id: string,
  parentId: string | null = null,
  parentNode: ApiSectionNode | null = null
): { node: ApiSectionNode; parentId: string | null; parentNode: ApiSectionNode | null } | null {
  for (const node of nodes) {
    if (node.id === id) return { node, parentId, parentNode };
    const found = findNodeInTree(node.children ?? [], id, node.id, node);
    if (found) return found;
  }
  return null;
}

function isDescendantOf(node: ApiSectionNode, targetId: string): boolean {
  return (node.children ?? []).some(
    (c) => c.id === targetId || isDescendantOf(c, targetId)
  );
}

type DropZone = "above" | "into" | "below";

function getDropZone(e: React.DragEvent): DropZone {
  const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
  const y = e.clientY - rect.top;
  const h = rect.height;
  if (y < h * 0.25) return "above";
  if (y > h * 0.75) return "below";
  return "into";
}

/** Depth-based folder colour palette, VS Code style. */
const FOLDER_PALETTE = [
  { open: "text-amber-400",   closed: "text-amber-500/50"   }, // depth 0
  { open: "text-sky-400",     closed: "text-sky-500/50"     }, // depth 1
  { open: "text-emerald-400", closed: "text-emerald-500/50" }, // depth 2
  { open: "text-violet-400",  closed: "text-violet-500/50"  }, // depth 3+
];

function folderColor(depth: number, isOpen: boolean): string {
  const entry = FOLDER_PALETTE[Math.min(depth, FOLDER_PALETTE.length - 1)];
  return isOpen ? entry.open : entry.closed;
}

// ── Inline editor component ───────────────────────────────────────────────

interface InlineEditorProps {
  initialName?: string;
  onSave: (name: string) => void;
  onCancel: () => void;
  isPending?: boolean;
  placeholder?: string;
  autoFocus?: boolean;
}

const InlineEditor = ({
  initialName = "",
  onSave,
  onCancel,
  isPending,
  placeholder = "Section name",
  autoFocus = true,
}: InlineEditorProps) => {
  const [value, setValue] = useState(initialName);

  const commit = () => {
    const trimmed = value.trim();
    if (trimmed) onSave(trimmed);
  };

  return (
    <div className="flex items-center gap-1.5">
      <input
        autoFocus={autoFocus}
        type="text"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter") commit();
          if (e.key === "Escape") onCancel();
        }}
        placeholder={placeholder}
        className="flex-1 min-w-0 px-2 py-1 text-sm rounded-md bg-background border border-primary ring-2 ring-primary/30 focus:outline-none"
      />
      <button
        type="button"
        onClick={commit}
        disabled={isPending || !value.trim()}
        className="p-1 rounded-md bg-primary text-primary-foreground hover:opacity-90 disabled:opacity-50 transition-opacity"
        title="Save"
      >
        {isPending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
      </button>
      <button
        type="button"
        onClick={onCancel}
        className="p-1 rounded-md border border-border text-muted-foreground hover:text-foreground transition-colors"
        title="Cancel"
      >
        <X className="w-3.5 h-3.5" />
      </button>
    </div>
  );
};

// ── Post assignment panel ────────────────────────────────────────────────

interface PostAssignPanelProps {
  sectionId: string;
  assignedPosts: ApiPostSummary[];
  onAssign: (postId: string, sectionId: string) => Promise<void>;
  onUnassign: (postId: string) => Promise<void>;
  isPending: boolean;
}

const POSTS_PER_PAGE = 10;

const PostAssignPanel = ({
  sectionId,
  assignedPosts,
  onAssign,
  onUnassign,
  isPending,
}: PostAssignPanelProps) => {
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(0);
  const [pendingId, setPendingId] = useState<string | null>(null);
  const searchRef = useRef<HTMLInputElement>(null);

  useEffect(() => { searchRef.current?.focus(); }, []);
  useEffect(() => { setPage(0); }, [search]);

  const { data: postsData, isLoading: isLoadingPosts } = useAdminPosts({
    limit: POSTS_PER_PAGE,
    offset: page * POSTS_PER_PAGE,
    sort: "title",
    order: "asc",
  });

  const assignedIds = useMemo(
    () => new Set(assignedPosts.map((p) => p.id)),
    [assignedPosts]
  );

  const q = search.toLowerCase().trim();
  const suggestions = useMemo(
    () =>
      (postsData?.posts ?? []).filter(
        (p) =>
          !assignedIds.has(p.id) &&
          (q === "" || p.title.toLowerCase().includes(q) || p.tags.some((t) => t.includes(q)))
      ),
    [postsData, assignedIds, q]
  );

  const totalPages = postsData ? Math.ceil(postsData.pagination.total / POSTS_PER_PAGE) : 1;

  const handleAssign = async (postId: string) => {
    setPendingId(postId);
    await onAssign(postId, sectionId);
    setPendingId(null);
  };

  const handleUnassign = async (postId: string) => {
    setPendingId(postId);
    await onUnassign(postId);
    setPendingId(null);
  };

  return (
    <div className="mt-1 mb-2 rounded-md border border-border/50 bg-background/60 overflow-hidden">
      {/* Assigned posts (from section tree — always accurate) */}
      {assignedPosts.length > 0 && (
        <div className="px-3 pt-2.5 pb-1.5">
          <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mb-1.5">
            Assigned ({assignedPosts.length})
          </p>
          <div className="flex flex-col gap-0.5">
            {assignedPosts.map((post) => (
              <div
                key={post.id}
                className="flex items-center justify-between gap-2 px-2 py-1 rounded hover:bg-secondary/60 group transition-colors"
              >
                <div className="flex items-center gap-1.5 min-w-0">
                  <FileText className="w-3 h-3 text-primary shrink-0" />
                  <span className="text-sm text-foreground truncate">{post.title}</span>
                  {post.tags.slice(0, 2).map((tag) => (
                    <span key={tag} className="hidden sm:inline text-[10px] font-mono px-1 py-0.5 rounded bg-secondary text-muted-foreground shrink-0">
                      {tag}
                    </span>
                  ))}
                </div>
                <button
                  type="button"
                  onClick={() => handleUnassign(post.id)}
                  disabled={isPending && pendingId === post.id}
                  className="shrink-0 p-1 rounded opacity-0 group-hover:opacity-100 hover:bg-secondary text-muted-foreground hover:text-destructive transition-all"
                  title="Remove from section"
                >
                  {isPending && pendingId === post.id ? (
                    <Loader2 className="w-3 h-3 animate-spin" />
                  ) : (
                    <Link2Off className="w-3 h-3" />
                  )}
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {assignedPosts.length > 0 && <div className="border-t border-border/40 mx-3" />}

      {/* Paginated suggestions */}
      <div className="px-3 pt-2 pb-2.5">
        <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mb-1.5">
          Add posts
        </p>
        <div className="flex items-center gap-1.5 px-2 py-1 rounded-md border border-border bg-background mb-1.5">
          <Search className="w-3 h-3 text-muted-foreground shrink-0" />
          <input
            ref={searchRef}
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Filter by title or tag…"
            className="flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground"
          />
          {search && (
            <button onClick={() => setSearch("")} className="text-muted-foreground hover:text-foreground">
              <X className="w-3 h-3" />
            </button>
          )}
        </div>

        <div className="max-h-40 overflow-y-auto flex flex-col gap-0.5">
          {isLoadingPosts ? (
            <div className="flex items-center justify-center py-4">
              <Loader2 className="w-3.5 h-3.5 animate-spin text-muted-foreground" />
            </div>
          ) : suggestions.length === 0 ? (
            <p className="text-xs text-muted-foreground py-2 text-center">
              {q ? "No matches on this page." : "No posts to assign on this page."}
            </p>
          ) : (
            suggestions.map((post) => (
              <div
                key={post.id}
                className="flex items-center justify-between gap-2 px-2 py-1 rounded hover:bg-secondary/60 group transition-colors"
              >
                <div className="flex items-center gap-1.5 min-w-0">
                  <FileText className="w-3 h-3 text-muted-foreground shrink-0" />
                  <span className="text-sm text-foreground truncate">{post.title}</span>
                  {post.section && (
                    <span className="hidden sm:inline text-[10px] font-mono px-1 py-0.5 rounded bg-primary/10 text-primary shrink-0">
                      {post.section.name}
                    </span>
                  )}
                  {post.tags.slice(0, 1).map((tag) => (
                    <span key={tag} className="hidden sm:inline text-[10px] font-mono px-1 py-0.5 rounded bg-secondary text-muted-foreground shrink-0">
                      {tag}
                    </span>
                  ))}
                </div>
                <button
                  type="button"
                  onClick={() => handleAssign(post.id)}
                  disabled={isPending && pendingId === post.id}
                  className="shrink-0 p-1 rounded opacity-0 group-hover:opacity-100 hover:bg-secondary text-muted-foreground hover:text-primary transition-all"
                  title="Add to this section"
                >
                  {isPending && pendingId === post.id ? (
                    <Loader2 className="w-3 h-3 animate-spin" />
                  ) : (
                    <Link2 className="w-3 h-3" />
                  )}
                </button>
              </div>
            ))
          )}
        </div>

        {/* Page navigation */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between mt-2 pt-1.5 border-t border-border/30">
            <button
              type="button"
              onClick={() => setPage((p) => Math.max(0, p - 1))}
              disabled={page === 0}
              className="text-xs px-2 py-0.5 rounded border border-border disabled:opacity-30 hover:bg-secondary transition-colors text-muted-foreground"
            >
              ← Prev
            </button>
            <span className="text-[11px] text-muted-foreground tabular-nums">
              {page + 1} / {totalPages}
            </span>
            <button
              type="button"
              onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
              disabled={page >= totalPages - 1}
              className="text-xs px-2 py-0.5 rounded border border-border disabled:opacity-30 hover:bg-secondary transition-colors text-muted-foreground"
            >
              Next →
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

// ── Section row (recursive) ────────────────────────────────────────────────

interface SectionRowProps {
  node: ApiSectionNode;
  depth: number;
  expanded: Set<string>;
  onToggle: (id: string) => void;
  editingId: string | null;
  addingChildOf: string | null;
  onStartEdit: (id: string) => void;
  onStartAddChild: (id: string) => void;
  onSaveEdit: (id: string, name: string) => void;
  onSaveChild: (parentId: string, name: string) => void;
  onCancelEdit: () => void;
  onDelete: (id: string, name: string) => void;
  isPendingEdit: boolean;
  isPendingChild: boolean;
  // Reordering
  isFirst: boolean;
  isLast: boolean;
  siblings: ApiSectionNode[];
  onMoveSection: (id: string, direction: "up" | "down", siblings: ApiSectionNode[]) => void;
  onReorder: (updates: { id: string; order: number }[]) => Promise<void>;
  onMoveTo: (draggedId: string, targetId: string, zone: DropZone) => Promise<void>;
  isReordering: boolean;
  // Post assignment
  assigningPostsOf: string | null;
  onStartAssignPosts: (id: string) => void;
  onAssignPost: (postId: string, sectionId: string) => Promise<void>;
  onUnassignPost: (postId: string) => Promise<void>;
  isPendingAssign: boolean;
  onPromoteToRoot: (id: string) => void;
  onToggleInProgress: (id: string, current: boolean) => void;
}

const SectionRow = ({
  node,
  depth,
  expanded,
  onToggle,
  editingId,
  addingChildOf,
  onStartEdit,
  onStartAddChild,
  onSaveEdit,
  onSaveChild,
  onCancelEdit,
  onDelete,
  isPendingEdit,
  isPendingChild,
  isFirst,
  isLast,
  siblings,
  onMoveSection,
  onReorder,
  onMoveTo,
  isReordering,
  assigningPostsOf,
  onStartAssignPosts,
  onAssignPost,
  onUnassignPost,
  isPendingAssign,
  onPromoteToRoot,
  onToggleInProgress,
}: SectionRowProps) => {
  const isExpanded = expanded.has(node.id);
  const hasChildren = (node.children ?? []).length > 0 || addingChildOf === node.id;
  const isEditing = editingId === node.id;
  const isAssigning = assigningPostsOf === node.id;
  const assignedCount = node.posts?.length ?? 0;

  return (
    <div className="relative">
      {/* tree guide line for nested items */}
      {depth > 0 && (
        <div
          className="absolute top-0 bottom-0 w-px bg-border/25 pointer-events-none"
          style={{ left: `${8 + (depth - 1) * 20 + 18}px` }}
        />
      )}
      <div
        className="group flex items-center gap-1.5 py-1 rounded-md hover:bg-secondary/60 transition-colors"
        style={{ paddingLeft: `${8 + depth * 20}px`, paddingRight: "8px" }}
      >
        {/* drag handle */}
        <span className="shrink-0 text-muted-foreground/40 cursor-grab opacity-0 group-hover:opacity-100 transition-opacity">
          <GripVertical className="w-3.5 h-3.5" />
        </span>

        {/* expand toggle */}
        <button
          type="button"
          onClick={() => hasChildren && onToggle(node.id)}
          className={`shrink-0 w-4 h-4 flex items-center justify-center text-muted-foreground transition-colors ${hasChildren ? "hover:text-foreground" : "cursor-default"}`}
        >
          {hasChildren ? (
            isExpanded ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5" />
          ) : (
            <span className="w-3.5 h-3.5" />
          )}
        </button>

        {/* folder icon — VS Code depth colours */}
        <span className={`shrink-0 ${folderColor(depth, hasChildren && isExpanded)}`}>
          {hasChildren && isExpanded ? (
            <FolderOpen className="w-3.5 h-3.5" />
          ) : (
            <Folder className="w-3.5 h-3.5" />
          )}
        </span>

        {/* name / inline edit */}
        {isEditing ? (
          <div className="flex-1 min-w-0">
            <InlineEditor
              initialName={node.name}
              onSave={(name) => onSaveEdit(node.id, name)}
              onCancel={onCancelEdit}
              isPending={isPendingEdit}
            />
          </div>
        ) : (
          <>
            <span className="flex-1 text-sm text-foreground truncate">{node.name}</span>
            <span className="text-xs text-muted-foreground font-mono opacity-0 group-hover:opacity-100 transition-opacity hidden sm:inline">
              /{node.slug}
            </span>

            {/* action buttons – only visible on hover */}
            <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
              {assignedCount > 0 && (
                <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-primary/10 text-primary mr-0.5">
                  {assignedCount}
                </span>
              )}
              <button
                type="button"
                onClick={() => onMoveSection(node.id, "up", siblings)}
                disabled={isFirst || isReordering}
                className="p-1 rounded hover:bg-secondary text-muted-foreground hover:text-foreground transition-colors disabled:opacity-30"
                title="Move up"
              >
                <ChevronUp className="w-3.5 h-3.5" />
              </button>
              <button
                type="button"
                onClick={() => onMoveSection(node.id, "down", siblings)}
                disabled={isLast || isReordering}
                className="p-1 rounded hover:bg-secondary text-muted-foreground hover:text-foreground transition-colors disabled:opacity-30"
                title="Move down"
              >
                <ChevronDown className="w-3.5 h-3.5" />
              </button>
              <button
                type="button"
                onClick={() => onStartAssignPosts(node.id)}
                className={`p-1 rounded hover:bg-secondary transition-colors ${
                  isAssigning ? "text-primary" : "text-muted-foreground hover:text-foreground"
                }`}
                title="Assign posts"
              >
                <BookOpen className="w-3.5 h-3.5" />
              </button>
              {depth > 0 && (
                <button
                  type="button"
                  onClick={() => onPromoteToRoot(node.id)}
                  className="p-1 rounded hover:bg-secondary text-muted-foreground hover:text-foreground transition-colors"
                  title="Promote to root level"
                >
                  <CornerUpLeft className="w-3.5 h-3.5" />
                </button>
              )}
              <button
                type="button"
                onClick={() => onStartAddChild(node.id)}
                className="p-1 rounded hover:bg-secondary text-muted-foreground hover:text-foreground transition-colors"
                title="Add child section"
              >
                <Plus className="w-3.5 h-3.5" />
              </button>
              <button
                type="button"
                onClick={() => onToggleInProgress(node.id, node.showInProgress ?? false)}
                className={`p-1 rounded hover:bg-secondary transition-colors ${
                  node.showInProgress ? "text-emerald-500" : "text-muted-foreground hover:text-foreground"
                }`}
                title={node.showInProgress ? "Remove from dashboard" : "Show in dashboard progress"}
              >
                <BarChart2 className="w-3.5 h-3.5" />
              </button>
              <button
                type="button"
                onClick={() => onStartEdit(node.id)}
                className="p-1 rounded hover:bg-secondary text-primary transition-colors"
                title="Rename"
              >
                <Pencil className="w-3.5 h-3.5" />
              </button>
              <button
                type="button"
                onClick={() => onDelete(node.id, node.name)}
                className="p-1 rounded hover:bg-secondary text-destructive transition-colors"
                title="Delete"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>
          </>
        )}
      </div>

      {/* Post assign panel */}
      {isAssigning && (
        <div style={{ paddingLeft: `${8 + (depth + 1) * 20}px`, paddingRight: "8px" }}>
          <PostAssignPanel
            sectionId={node.id}
            assignedPosts={node.posts ?? []}
            onAssign={onAssignPost}
            onUnassign={onUnassignPost}
            isPending={isPendingAssign}
          />
        </div>
      )}

      {/* Children */}
      {isExpanded && (
        <div>
          <DraggableSectionList
            nodes={node.children ?? []}
            depth={depth + 1}
            onReorder={onReorder}
            onMoveTo={onMoveTo}
            isReordering={isReordering}
            expanded={expanded}
            onToggle={onToggle}
            editingId={editingId}
            addingChildOf={addingChildOf}
            onStartEdit={onStartEdit}
            onStartAddChild={onStartAddChild}
            onSaveEdit={onSaveEdit}
            onSaveChild={onSaveChild}
            onCancelEdit={onCancelEdit}
            onDelete={onDelete}
            isPendingEdit={isPendingEdit}
            isPendingChild={isPendingChild}
            onMoveSection={onMoveSection}
            assigningPostsOf={assigningPostsOf}
            onStartAssignPosts={onStartAssignPosts}
            onAssignPost={onAssignPost}
            onUnassignPost={onUnassignPost}
            isPendingAssign={isPendingAssign}
            onPromoteToRoot={onPromoteToRoot}
            onToggleInProgress={onToggleInProgress}
          />

          {addingChildOf === node.id && (
            <div
              className="py-1.5 px-2"
              style={{ paddingLeft: `${8 + (depth + 1) * 20}px` }}
            >
              <InlineEditor
                placeholder="New child section name"
                onSave={(name) => onSaveChild(node.id, name)}
                onCancel={onCancelEdit}
                isPending={isPendingChild}
              />
            </div>
          )}
        </div>
      )}
    </div>
  );
};

// ── Draggable section list ────────────────────────────────────────────────

interface DraggableSectionListProps {
  nodes: ApiSectionNode[];
  depth: number;
  onReorder: (updates: { id: string; order: number }[]) => Promise<void>;
  onMoveTo: (draggedId: string, targetId: string, zone: DropZone) => Promise<void>;
  isReordering: boolean;
  expanded: Set<string>;
  onToggle: (id: string) => void;
  editingId: string | null;
  addingChildOf: string | null;
  onStartEdit: (id: string) => void;
  onStartAddChild: (id: string) => void;
  onSaveEdit: (id: string, name: string) => void;
  onSaveChild: (parentId: string, name: string) => void;
  onCancelEdit: () => void;
  onDelete: (id: string, name: string) => void;
  isPendingEdit: boolean;
  isPendingChild: boolean;
  onMoveSection: (id: string, direction: "up" | "down", siblings: ApiSectionNode[]) => void;
  assigningPostsOf: string | null;
  onStartAssignPosts: (id: string) => void;
  onAssignPost: (postId: string, sectionId: string) => Promise<void>;
  onUnassignPost: (postId: string) => Promise<void>;
  isPendingAssign: boolean;
  onPromoteToRoot: (id: string) => void;
  onToggleInProgress: (id: string, current: boolean) => void;
}

const DraggableSectionList = ({
  nodes,
  depth,
  onReorder,
  onMoveTo,
  isReordering,
  ...rowProps
}: DraggableSectionListProps) => {
  const [orderedNodes, setOrderedNodes] = useState<ApiSectionNode[]>(() =>
    [...nodes].sort((a, b) => a.order - b.order)
  );
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [movingId, setMovingId] = useState<string | null>(null);
  const [dropTarget, setDropTarget] = useState<{ idx: number; zone: DropZone } | null>(null);
  const [revertError, setRevertError] = useState<string | null>(null);

  // Sync with server data whenever nodes change (but not mid-drag)
  useEffect(() => {
    if (draggingId === null) {
      setOrderedNodes([...nodes].sort((a, b) => a.order - b.order));
    }
  }, [nodes, draggingId]);

  const handleDragStart = (e: React.DragEvent, id: string) => {
    e.dataTransfer.effectAllowed = "move";
    e.dataTransfer.setData("text/plain", id);
    setRevertError(null);
    setTimeout(() => setDraggingId(id), 0);
  };

  const handleDragOver = (e: React.DragEvent, idx: number) => {
    e.preventDefault();
    e.stopPropagation(); // only the innermost hovered row handles this
    e.dataTransfer.dropEffect = "move";
    setDropTarget({ idx, zone: getDropZone(e) });
  };

  const handleDrop = async (e: React.DragEvent, idx: number) => {
    e.preventDefault();
    e.stopPropagation();

    const draggedId = e.dataTransfer.getData("text/plain");
    const zone = dropTarget?.idx === idx ? dropTarget.zone : getDropZone(e);
    const targetNode = orderedNodes[idx];

    setDraggingId(null);
    setDropTarget(null);

    if (!draggedId || !targetNode || draggedId === targetNode.id) return;

    const isSibling = orderedNodes.some((n) => n.id === draggedId);

    if (isSibling && zone !== "into") {
      // Same-parent reorder — optimistic update
      const draggedNode = orderedNodes.find((n) => n.id === draggedId)!;
      const previous = [...orderedNodes];
      const withoutDragged = orderedNodes.filter((n) => n.id !== draggedId);
      const targetIdx = withoutDragged.findIndex((n) => n.id === targetNode.id);
      const insertIdx = zone === "above" ? targetIdx : targetIdx + 1;
      const reordered = [...withoutDragged];
      reordered.splice(insertIdx, 0, draggedNode);
      setOrderedNodes(reordered);

      try {
        await onReorder(reordered.map((s, i) => ({ id: s.id, order: i })));
      } catch {
        setOrderedNodes(previous);
        setRevertError("Reorder failed — changes reverted.");
      }
    } else {
      // Cross-parent move, or nesting into a sibling — delegate to tree handler
      setMovingId(draggedId);
      try {
        await onMoveTo(draggedId, targetNode.id, zone);
      } catch {
        setRevertError("Move failed — please try again.");
      } finally {
        setMovingId(null);
      }
    }
  };

  const handleDragEnd = () => {
    setDraggingId(null);
    setDropTarget(null);
  };

  return (
    <>
      {revertError && (
        <div className="mx-2 my-1 px-3 py-1.5 rounded-md bg-destructive/10 border border-destructive/20 text-destructive text-xs flex items-center justify-between gap-2">
          <span>{revertError}</span>
          <button
            type="button"
            onClick={() => setRevertError(null)}
            className="shrink-0 hover:opacity-70 transition-opacity"
          >
            <X className="w-3 h-3" />
          </button>
        </div>
      )}
      {orderedNodes.map((node, i) => {
        const dz = dropTarget?.idx === i ? dropTarget.zone : null;
        return (
          <div
            key={node.id}
            draggable={!isReordering}
            onDragStart={(e) => handleDragStart(e, node.id)}
            onDragOver={(e) => handleDragOver(e, i)}
            onDrop={(e) => handleDrop(e, i)}
            onDragEnd={handleDragEnd}
            className={[
              "border-t-2 border-b-2 transition-colors",
              draggingId === node.id || movingId === node.id ? "opacity-40" : "",
              dz === "above" ? "border-t-primary" : "border-t-transparent",
              dz === "below" ? "border-b-primary" : "border-b-transparent",
              dz === "into" ? "rounded-md ring-2 ring-inset ring-primary/40 bg-primary/5" : "",
            ]
              .filter(Boolean)
              .join(" ")}
          >
            <SectionRow
              node={node}
              depth={depth}
              isFirst={i === 0}
              isLast={i === orderedNodes.length - 1}
              siblings={orderedNodes}
              onReorder={onReorder}
              onMoveTo={onMoveTo}
              isReordering={isReordering}
              {...rowProps}
            />
          </div>
        );
      })}
    </>
  );
};

// ── Main Page ──────────────────────────────────────────────────────────────

const AdminSections = () => {
  const navigate = useNavigate();
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [editingId, setEditingId] = useState<string | null>(null);
  const [addingChildOf, setAddingChildOf] = useState<string | null>(null);
  const [addingRoot, setAddingRoot] = useState(false);
  const [assigningPostsOf, setAssigningPostsOf] = useState<string | null>(null);
  const [pendingDelete, setPendingDelete] = useState<{
    id: string;
    name: string;
    childrenCount: number;
  } | null>(null);

  const hasToken = !!getToken();
  const { data: authData, isLoading: isVerifying } = useVerifyToken();
  const isAuth = hasToken && authData?.valid;

  const { data: sectionData, isLoading: isLoadingSections } = useSectionTree();
  const logoutMutation = useLogout();
  const createMutation = useCreateSection();
  const updateMutation = useUpdateSection();
  const deleteMutation = useDeleteSection();
  const reorderMutation = useReorderSections();
  const updatePostMutation = useUpdatePost();

  const sections = sectionData?.sections ?? [];

  const handleLogout = () => {
    logoutMutation.mutate();
    navigate("/");
  };

  const handleToggle = (id: string) => {
    setExpanded((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const handleStartEdit = (id: string) => {
    setEditingId(id);
    setAddingChildOf(null);
    setAddingRoot(false);
  };

  const handleStartAddChild = (id: string) => {
    setAddingChildOf(id);
    setEditingId(null);
    setAddingRoot(false);
    setExpanded((prev) => new Set([...prev, id]));
  };

  const handleCancelEdit = () => {
    setEditingId(null);
    setAddingChildOf(null);
    setAddingRoot(false);
  };

  const handleStartAssignPosts = (id: string) => {
    setAssigningPostsOf((prev) => (prev === id ? null : id));
    setEditingId(null);
    setAddingChildOf(null);
    setAddingRoot(false);
  };

  const handleAssignPost = async (postId: string, sectionId: string) => {
    await updatePostMutation.mutateAsync({ id: postId, data: { sectionId } });
  };

  const handleUnassignPost = async (postId: string) => {
    await updatePostMutation.mutateAsync({ id: postId, data: { sectionId: null } });
  };

  const handleSaveEdit = async (id: string, name: string) => {
    await updateMutation.mutateAsync({ id, data: { name, slug: slugify(name) } });
    setEditingId(null);
  };

  const handleSaveChild = async (parentId: string, name: string) => {
    await createMutation.mutateAsync({ name, slug: slugify(name), parentId });
    setAddingChildOf(null);
  };

  const handleSaveRoot = async (name: string) => {
    await createMutation.mutateAsync({ name, slug: slugify(name), parentId: null });
    setAddingRoot(false);
  };

  const handleReorderSections = async (updates: { id: string; order: number }[]) => {
    await reorderMutation.mutateAsync({ sections: updates });
  };

  const handleMoveSection = async (id: string, direction: "up" | "down", siblings: ApiSectionNode[]) => {
    const sorted = [...siblings].sort((a, b) => a.order - b.order);
    const idx = sorted.findIndex((s) => s.id === id);
    if (idx === -1) return;
    if (direction === "up" && idx === 0) return;
    if (direction === "down" && idx === sorted.length - 1) return;

    const swapIdx = direction === "up" ? idx - 1 : idx + 1;
    const reordered = [...sorted];
    [reordered[idx], reordered[swapIdx]] = [reordered[swapIdx], reordered[idx]];

    await handleReorderSections(reordered.map((s, i) => ({ id: s.id, order: i })));
  };

  /** Tree-wide drag: move a section to a new parent or position. */
  const handleSectionMoveTo = async (
    draggedId: string,
    targetId: string,
    zone: DropZone
  ) => {
    if (draggedId === targetId) return;

    const draggedResult = findNodeInTree(sections, draggedId);
    const targetResult = findNodeInTree(sections, targetId);
    if (!draggedResult || !targetResult) return;

    const { node: draggedNode, parentId: draggedParentId } = draggedResult;
    const { node: targetNode, parentId: targetParentId, parentNode: targetParentNode } = targetResult;

    if (zone === "into") {
      // Prevent nesting into own descendant
      if (isDescendantOf(draggedNode, targetId)) return;

      const targetChildren = (targetNode.children ?? [])
        .filter((c) => c.id !== draggedId)
        .sort((a, b) => a.order - b.order);

      await updateMutation.mutateAsync({
        id: draggedId,
        data: { parentId: targetNode.id, order: targetChildren.length },
      });

      // Auto-expand the target so user sees the moved section
      setExpanded((prev) => new Set([...prev, targetId]));
    } else {
      // Drop above or below → become sibling of target at target's level
      const newParentId = targetParentId;

      const targetLevelNodes = (
        newParentId === null ? sections : (targetParentNode?.children ?? [])
      )
        .filter((s) => s.id !== draggedId)
        .sort((a, b) => a.order - b.order);

      const targetIdx = targetLevelNodes.findIndex((s) => s.id === targetId);
      const insertIdx = zone === "above" ? targetIdx : targetIdx + 1;
      const reordered = [...targetLevelNodes];
      reordered.splice(insertIdx, 0, draggedNode);

      // Change parentId first if moving cross-parent
      if (draggedParentId !== newParentId) {
        await updateMutation.mutateAsync({
          id: draggedId,
          data: { parentId: newParentId },
        });
      }

      await reorderMutation.mutateAsync({
        sections: reordered.map((s, i) => ({ id: s.id, order: i })),
      });
    }
  };

  const handlePromoteToRoot = async (id: string) => {
    await updateMutation.mutateAsync({ id, data: { parentId: null } });
  };

  const handleToggleInProgress = async (id: string, current: boolean) => {
    await updateMutation.mutateAsync({ id, data: { showInProgress: !current } });
  };

  const handleDelete = (id: string, name: string) => {
    const result = findNodeInTree(sections, id);
    const childrenCount = (result?.node.children ?? []).length;
    setPendingDelete({ id, name, childrenCount });
  };

  const handleDeleteCascade = async () => {
    if (!pendingDelete) return;
    await deleteMutation.mutateAsync({ id: pendingDelete.id, mode: "cascade" });
    setPendingDelete(null);
  };

  const handleDeletePromote = async () => {
    if (!pendingDelete) return;
    await deleteMutation.mutateAsync({ id: pendingDelete.id, mode: "promote" });
    setPendingDelete(null);
  };

  const handleDeleteSimple = async () => {
    if (!pendingDelete) return;
    await deleteMutation.mutateAsync({ id: pendingDelete.id });
    setPendingDelete(null);
  };

  // Auth guard
  if (isVerifying && hasToken) {
    return (
      <Layout>
        <section className="min-h-[80vh] flex items-center justify-center">
          <Loader2 className="w-6 h-6 animate-spin text-primary" />
        </section>
      </Layout>
    );
  }

  if (!isAuth) {
    navigate("/manohar");
    return null;
  }

  return (
    <Layout>
      <section className="max-w-3xl mx-auto px-4 sm:px-6 md:px-8 pt-6 pb-12">
        <Breadcrumb
          items={[
            { label: "Home", to: "/" },
            { label: "Admin", to: "/manohar" },
            { label: "Sections" },
          ]}
        />

        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-5 animate-fade-in">
          <div>
            <h1 className="text-2xl font-bold text-foreground mb-1">Sections</h1>
            <p className="text-sm text-muted-foreground">
              Organize your posts into nested folders.
            </p>
          </div>
          <div className="flex gap-2">
            <button
              onClick={handleLogout}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm rounded-md border border-border/40 text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span className="hidden xs:inline">Logout</span>
            </button>
            <button
              onClick={() => {
                setAddingRoot(true);
                setEditingId(null);
                setAddingChildOf(null);
              }}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-primary text-primary-foreground text-sm font-medium hover:opacity-90 transition-opacity"
            >
              <Plus className="w-3.5 h-3.5" />
              <span className="hidden xs:inline">New Section</span>
            </button>
          </div>
        </div>

        {/* Error */}
        {(createMutation.isError || updateMutation.isError || deleteMutation.isError) && (
          <div className="mb-3 p-3 rounded-md bg-destructive/10 border border-destructive/20 text-destructive text-sm">
            {createMutation.error?.message ||
              updateMutation.error?.message ||
              deleteMutation.error?.message ||
              "Operation failed"}
          </div>
        )}

        {/* Loading */}
        {isLoadingSections && (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-6 h-6 animate-spin text-primary" />
          </div>
        )}

        {/* Content */}
        {!isLoadingSections && (
          <div className="rounded-lg border border-border/40 bg-card p-2 animate-fade-in">
            {sections.length === 0 && !addingRoot ? (
              <div className="py-10 text-center text-muted-foreground">
                <FolderTree className="w-10 h-10 mx-auto mb-3 opacity-40" />
                <p className="text-sm">No sections yet.</p>
                <p className="text-xs mt-1">
                  Click <strong>New Section</strong> to create your first folder.
                </p>
              </div>
            ) : (
              <>
                {sections.length > 0 && (
                  <DraggableSectionList
                    nodes={sections}
                    depth={0}
                    onReorder={handleReorderSections}
                    onMoveTo={handleSectionMoveTo}
                    isReordering={reorderMutation.isPending || updateMutation.isPending}
                    expanded={expanded}
                    onToggle={handleToggle}
                    editingId={editingId}
                    addingChildOf={addingChildOf}
                    onStartEdit={handleStartEdit}
                    onStartAddChild={handleStartAddChild}
                    onSaveEdit={handleSaveEdit}
                    onSaveChild={handleSaveChild}
                    onCancelEdit={handleCancelEdit}
                    onDelete={handleDelete}
                    isPendingEdit={updateMutation.isPending}
                    isPendingChild={createMutation.isPending}
                    onMoveSection={handleMoveSection}
                    assigningPostsOf={assigningPostsOf}
                    onStartAssignPosts={handleStartAssignPosts}
                    onAssignPost={handleAssignPost}
                    onUnassignPost={handleUnassignPost}
                    isPendingAssign={updatePostMutation.isPending}
                    onPromoteToRoot={handlePromoteToRoot}
                    onToggleInProgress={handleToggleInProgress}
                  />
                )}

                {/* Add root inline editor — rendered below existing sections so it's
                    visually clear the new section is a sibling, not a parent */}
                {addingRoot && (
                  <div className={`px-2 py-1.5 ${sections.length > 0 ? "mt-1 border-t border-border/30 pt-2" : ""}`}>
                    <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mb-1.5">
                      New section — same level as existing sections
                    </p>
                    <InlineEditor
                      placeholder="Section name"
                      onSave={handleSaveRoot}
                      onCancel={handleCancelEdit}
                      isPending={createMutation.isPending}
                    />
                  </div>
                )}
              </>
            )}
          </div>
        )}

        {/* Footer tip */}
        <p className="mt-4 text-xs text-muted-foreground text-center">
          Drag sections across folders, or hover to rename, add children, or delete.
        </p>
      </section>

      {/* Delete confirmation dialog */}
      <Dialog open={!!pendingDelete} onOpenChange={(open) => !open && setPendingDelete(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Delete &ldquo;{pendingDelete?.name}&rdquo;</DialogTitle>
            <DialogDescription>
              {pendingDelete?.childrenCount
                ? `This section has ${pendingDelete.childrenCount} child section${pendingDelete.childrenCount > 1 ? "s" : ""}. Choose what to do with them.`
                : "This will permanently delete the section. Any posts inside will be unassigned."}
            </DialogDescription>
          </DialogHeader>

          {pendingDelete?.childrenCount ? (
            <div className="flex flex-col gap-3 py-1">
              {/* Option 1 — cascade */}
              <button
                type="button"
                onClick={handleDeleteCascade}
                disabled={deleteMutation.isPending}
                className="flex items-start gap-3 rounded-lg border border-destructive/40 bg-destructive/5 p-3 text-left hover:bg-destructive/10 transition-colors disabled:opacity-50"
              >
                <Trash2 className="w-4 h-4 mt-0.5 shrink-0 text-destructive" />
                <div>
                  <p className="text-sm font-medium text-foreground">Delete all children</p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Permanently removes this section and all {pendingDelete.childrenCount} child section{pendingDelete.childrenCount > 1 ? "s" : ""} (and their descendants). Posts are unassigned.
                  </p>
                </div>
              </button>

              {/* Option 2 — promote */}
              <button
                type="button"
                onClick={handleDeletePromote}
                disabled={deleteMutation.isPending}
                className="flex items-start gap-3 rounded-lg border border-border bg-secondary/40 p-3 text-left hover:bg-secondary/70 transition-colors disabled:opacity-50"
              >
                <CornerUpLeft className="w-4 h-4 mt-0.5 shrink-0 text-foreground" />
                <div>
                  <p className="text-sm font-medium text-foreground">
                    Promote children to root
                  </p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Moves all {pendingDelete.childrenCount} direct child section{pendingDelete.childrenCount > 1 ? "s" : ""} to the top level, then deletes this section. Their sub-sections remain intact.
                  </p>
                </div>
              </button>

              <DialogFooter className="mt-1">
                <button
                  type="button"
                  onClick={() => setPendingDelete(null)}
                  className="px-3 py-1.5 rounded-md border border-border text-sm text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors"
                >
                  Cancel
                </button>
              </DialogFooter>
            </div>
          ) : (
            <DialogFooter>
              <button
                type="button"
                onClick={() => setPendingDelete(null)}
                className="px-3 py-1.5 rounded-md border border-border text-sm text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleDeleteSimple}
                disabled={deleteMutation.isPending}
                className="px-3 py-1.5 rounded-md bg-destructive text-destructive-foreground text-sm font-medium hover:opacity-90 transition-opacity disabled:opacity-50"
              >
                {deleteMutation.isPending ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin inline mr-1" />
                ) : null}
                Delete
              </button>
            </DialogFooter>
          )}
        </DialogContent>
      </Dialog>
    </Layout>
  );
};

export default AdminSections;
