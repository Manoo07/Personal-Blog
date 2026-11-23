import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";

/**
 * Obsidian-style context menu: compact rows with a leading icon, separators,
 * an optional inline colour-swatch row, full keyboard support (↑ ↓ ↵ Esc).
 */

export type MenuEntry =
  | {
      type: "item";
      label: string;
      icon?: React.ComponentType<{ className?: string; strokeWidth?: number }>;
      hint?: string;
      danger?: boolean;
      disabled?: boolean;
      onSelect: () => void;
    }
  | { type: "separator" }
  | { type: "label"; label: string }
  | {
      type: "swatches";
      label: string;
      icon?: React.ComponentType<{ className?: string; strokeWidth?: number }>;
      colors: readonly { key: string; swatch: string; label: string }[];
      current?: string;
      onPick: (key: string) => void;
    };

interface ContextMenuProps {
  x: number;
  y: number;
  entries: MenuEntry[];
  onClose: () => void;
}

const ContextMenu = ({ x, y, entries, onClose }: ContextMenuProps) => {
  const ref = useRef<HTMLDivElement>(null);
  const [pos, setPos] = useState({ left: x, top: y, ready: false });

  // Keep the menu on screen (flip left / up near edges, like a native menu)
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    const { width, height } = el.getBoundingClientRect();
    const left = x + width + 8 > window.innerWidth ? Math.max(8, x - width) : x;
    const top = y + height + 8 > window.innerHeight ? Math.max(8, y - height) : y;
    setPos({ left, top, ready: true });
  }, [x, y]);

  // Close on outside press, Escape, scroll, resize, window blur
  useEffect(() => {
    const onDown = (e: MouseEvent) => {
      if (!ref.current?.contains(e.target as Node)) onClose();
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        onClose();
        return;
      }
      if (e.key === "ArrowDown" || e.key === "ArrowUp") {
        e.preventDefault();
        const items = Array.from(ref.current?.querySelectorAll<HTMLElement>("[data-menu-item]:not([disabled])") ?? []);
        if (!items.length) return;
        const i = items.indexOf(document.activeElement as HTMLElement);
        const next = e.key === "ArrowDown" ? (i + 1) % items.length : (i - 1 + items.length) % items.length;
        items[next].focus();
      }
    };
    const close = () => onClose();
    document.addEventListener("mousedown", onDown, true);
    document.addEventListener("keydown", onKey, true);
    window.addEventListener("scroll", close, true);
    window.addEventListener("resize", close);
    window.addEventListener("blur", close);
    return () => {
      document.removeEventListener("mousedown", onDown, true);
      document.removeEventListener("keydown", onKey, true);
      window.removeEventListener("scroll", close, true);
      window.removeEventListener("resize", close);
      window.removeEventListener("blur", close);
    };
  }, [onClose]);

  const run = (fn: () => void) => {
    onClose();
    fn();
  };

  return (
    <div
      ref={ref}
      role="menu"
      data-article-menu
      // keep the text selection alive while interacting with the menu
      onMouseDown={(e) => e.preventDefault()}
      onContextMenu={(e) => e.preventDefault()}
      style={{ position: "fixed", left: pos.left, top: pos.top, zIndex: 70, visibility: pos.ready ? "visible" : "hidden" }}
      className="min-w-[220px] max-w-[280px] p-1 rounded-[8px] bg-[hsl(0_0%_97%)] border border-black/10 shadow-[0_8px_24px_rgba(0,0,0,0.14),0_1px_3px_rgba(0,0,0,0.08)] text-[13.5px] text-foreground select-none animate-in fade-in-0 zoom-in-95 duration-100"
    >
      {entries.map((entry, i) => {
        if (entry.type === "separator") return <div key={i} className="my-1 mx-1.5 h-px bg-black/10" />;

        if (entry.type === "label")
          return (
            <div key={i} className="px-2.5 pt-1 pb-1.5 text-[12px] text-muted-foreground line-clamp-2 italic">
              {entry.label}
            </div>
          );

        if (entry.type === "swatches") {
          const Icon = entry.icon;
          return (
            <div key={i} className="flex items-center gap-2.5 h-[30px] px-2.5">
              {Icon && <Icon className="w-4 h-4 text-muted-foreground shrink-0" strokeWidth={1.75} />}
              <span className="flex-1">{entry.label}</span>
              <div className="flex items-center gap-[5px]">
                {entry.colors.map((c) => (
                  <button
                    key={c.key}
                    type="button"
                    data-menu-item
                    title={c.label}
                    aria-label={`${entry.label}: ${c.label}`}
                    onClick={() => run(() => entry.onPick(c.key))}
                    style={{ backgroundColor: c.swatch }}
                    className={cn(
                      "w-[15px] h-[15px] rounded-full outline-none transition-transform hover:scale-125 focus-visible:scale-125 focus-visible:ring-2 focus-visible:ring-primary/50",
                      entry.current === c.key && "ring-2 ring-offset-1 ring-foreground/50"
                    )}
                  />
                ))}
              </div>
            </div>
          );
        }

        const Icon = entry.icon;
        return (
          <button
            key={i}
            type="button"
            role="menuitem"
            data-menu-item
            disabled={entry.disabled}
            onClick={() => run(entry.onSelect)}
            className={cn(
              "w-full flex items-center gap-2.5 h-[30px] px-2.5 rounded-[5px] text-left outline-none transition-colors",
              "hover:bg-accent/70 focus-visible:bg-accent/70 disabled:opacity-40 disabled:pointer-events-none",
              entry.danger && "text-destructive"
            )}
          >
            {Icon && (
              <Icon
                className={cn("w-4 h-4 shrink-0", entry.danger ? "text-destructive" : "text-muted-foreground")}
                strokeWidth={1.75}
              />
            )}
            <span className="flex-1 truncate">{entry.label}</span>
            {entry.hint && <span className="text-[11.5px] text-muted-foreground">{entry.hint}</span>}
          </button>
        );
      })}
    </div>
  );
};

export default ContextMenu;
