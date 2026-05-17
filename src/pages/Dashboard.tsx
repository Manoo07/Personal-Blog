import { useState } from "react";
import { Link } from "react-router-dom";
import Layout from "@/components/Layout";
import { useUserAuth } from "@/contexts/UserAuthContext";
import { useUserStats } from "@/hooks/use-api";
import { Progress } from "@/components/ui/progress";
import {
  Loader2,
  CheckCircle2,
  Lock,
  ChevronRight,
  ChevronDown,
  Circle,
  FileText,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { SectionStatNode } from "@/lib/api";

// ── Login guard ───────────────────────────────────────────────────────────────

function LoginPrompt() {
  const { openAuthModal } = useUserAuth();
  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4 text-center px-4">
      <Lock className="w-10 h-10 text-muted-foreground/40" />
      <h2 className="text-lg font-semibold">Sign in to view your progress</h2>
      <p className="text-sm text-muted-foreground max-w-sm">
        Track which posts you've completed and see your learning stats across all sections.
      </p>
      <button
        onClick={() => openAuthModal("login")}
        className="mt-2 px-5 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors"
      >
        Sign In
      </button>
    </div>
  );
}

// ── Section accordion item (recursive) ───────────────────────────────────────

interface SectionAccordionProps {
  node: SectionStatNode;
  depth?: number;
  defaultOpen?: boolean;
}

function SectionAccordion({ node, depth = 0, defaultOpen = true }: SectionAccordionProps) {
  const [open, setOpen] = useState(defaultOpen);
  const pct = node.total > 0 ? Math.round((node.completed / node.total) * 100) : 0;
  const hasContent = node.posts.length > 0 || node.children.length > 0;
  const isComplete = node.total > 0 && node.completed === node.total;
  const isEmpty = node.total === 0;

  return (
    <div className={cn(
      "rounded-lg border border-border/40 overflow-hidden",
      depth === 0 ? "bg-card/60" : "bg-transparent border-border/20"
    )}>
      {/* Section header */}
      <button
        type="button"
        onClick={() => hasContent && setOpen((o) => !o)}
        className={cn(
          "w-full flex items-center gap-3 text-left transition-colors",
          depth === 0 ? "px-4 py-3" : "px-3 py-2",
          hasContent ? "hover:bg-secondary/40 cursor-pointer" : "cursor-default"
        )}
      >
        {/* Chevron */}
        {hasContent ? (
          <span className="shrink-0 text-muted-foreground">
            {open
              ? <ChevronDown className="w-3.5 h-3.5" />
              : <ChevronRight className="w-3.5 h-3.5" />}
          </span>
        ) : (
          <span className="w-3.5 h-3.5 shrink-0" />
        )}

        {/* Name + fraction + progress bar */}
        <div className="flex-1 min-w-0 space-y-1.5">
          <div className="flex items-center justify-between gap-2">
            <span className={cn(
              "font-medium truncate",
              depth === 0 ? "text-sm" : "text-xs text-muted-foreground/80",
              isEmpty && "opacity-50"
            )}>
              {node.sectionName}
            </span>
            <span className="shrink-0 tabular-nums text-xs text-muted-foreground">
              {isEmpty
                ? <span className="text-[10px] italic opacity-40">no posts</span>
                : isComplete
                  ? <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 inline" />
                  : `${node.completed}/${node.total}`}
            </span>
          </div>
          {!isEmpty && (
            <Progress
              value={pct}
              className={cn("w-full", depth === 0 ? "h-1.5" : "h-1")}
            />
          )}
        </div>
      </button>

      {/* Expanded content: direct posts + child sections */}
      {hasContent && open && (
        <div className={cn(
          "border-t border-border/20",
          depth === 0 ? "px-4 pb-3 pt-2" : "px-3 pb-2 pt-1"
        )}>
          {/* Direct posts */}
          {node.posts.length > 0 && (
            <ul className="space-y-0.5 mb-2">
              {node.posts.map((post) => (
                <li key={post.postId}>
                  <Link
                    to={`/blog/${post.postSlug}`}
                    className={cn(
                      "flex items-center gap-2.5 px-2 py-1.5 rounded-md transition-colors text-[12px] group",
                      post.isCompleted
                        ? "text-muted-foreground hover:text-foreground hover:bg-secondary/40"
                        : "text-foreground/80 hover:text-foreground hover:bg-secondary/40"
                    )}
                  >
                    {post.isCompleted ? (
                      <CheckCircle2 className="w-3.5 h-3.5 shrink-0 text-emerald-500" />
                    ) : (
                      <FileText className="w-3.5 h-3.5 shrink-0 text-muted-foreground/50 group-hover:text-muted-foreground" />
                    )}
                    <span className={cn(
                      "truncate",
                      post.isCompleted && "line-through decoration-muted-foreground/30"
                    )}>
                      {post.postTitle}
                    </span>
                    <ChevronRight className="w-3 h-3 ml-auto shrink-0 opacity-0 group-hover:opacity-50 transition-opacity" />
                  </Link>
                </li>
              ))}
            </ul>
          )}

          {/* Child sections */}
          {node.children
            .filter((c) => c.total > 0 || c.children.length > 0)
            .map((child) => (
              <div key={child.sectionId} className="mt-1.5">
                <SectionAccordion node={child} depth={depth + 1} defaultOpen={false} />
              </div>
            ))}
        </div>
      )}
    </div>
  );
}

// ── Main dashboard ────────────────────────────────────────────────────────────

export default function Dashboard() {
  const { isLoggedIn, currentUser } = useUserAuth();
  const { data: statsData, isLoading } = useUserStats();

  if (!isLoggedIn) {
    return (
      <Layout>
        <LoginPrompt />
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="max-w-3xl mx-auto px-4 sm:px-6 py-10 space-y-10">
        {/* Header */}
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Learning Progress</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Welcome back,{" "}
            <span className="text-foreground font-medium">{currentUser?.username}</span>
          </p>
        </div>

        {isLoading ? (
          <div className="flex justify-center py-16">
            <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <>
            {/* Overall progress */}
            {statsData && (
              <section className="rounded-xl border border-border/50 bg-card p-6 space-y-4">
                <div className="flex items-center justify-between">
                  <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
                    Overall
                  </h2>
                  <span className="text-2xl font-bold tabular-nums">
                    {statsData.completionPercent}%
                  </span>
                </div>
                <Progress value={statsData.completionPercent} className="h-2" />
                <p className="text-xs text-muted-foreground">
                  {statsData.completedPosts} of {statsData.totalPosts} published posts completed
                </p>
              </section>
            )}

            {/* Sections with inline posts */}
            {statsData && statsData.sections.length > 0 && (
              <section className="space-y-3">
                <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
                  By Section
                </h2>
                <div className="space-y-2">
                  {statsData.sections.map((s) => (
                    <SectionAccordion
                      key={s.sectionId}
                      node={s}
                      depth={0}
                      defaultOpen={true}
                    />
                  ))}
                </div>
              </section>
            )}
          </>
        )}
      </div>
    </Layout>
  );
}
