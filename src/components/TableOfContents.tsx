import { useEffect, useState, useRef, useCallback } from "react";
import { cn } from "@/lib/utils";

interface Heading {
  id: string;
  text: string;
  level: number;
}

const TableOfContents = () => {
  const [headings, setHeadings] = useState<Heading[]>([]);
  const [activeId, setActiveId] = useState<string>("");
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const itemRefs = useRef<Map<string, HTMLLIElement>>(new Map());

  // Scroll the TOC container so the active item is centered
  const scrollTocToActiveItem = useCallback((headingId: string) => {
    const container = scrollContainerRef.current;
    const activeItem = itemRefs.current.get(headingId);

    if (!container || !activeItem) return;

    const containerHeight = container.clientHeight;
    const itemOffsetTop = activeItem.offsetTop;
    const itemHeight = activeItem.clientHeight;

    // Scroll to place the active item in the center of the container
    const targetScroll = itemOffsetTop - (containerHeight / 2) + (itemHeight / 2);

    container.scrollTo({
      top: Math.max(0, targetScroll),
      behavior: "smooth",
    });
  }, []);

  // Track active heading based on scroll position
  useEffect(() => {
    const article = document.querySelector("article");
    if (!article) return;

    const headingElements = article.querySelectorAll("h1, h2, h3, h4, h5, h6");
    const headingData: Heading[] = [];

    headingElements.forEach((heading, index) => {
      const id = heading.id || `heading-${index}`;
      if (!heading.id) {
        heading.id = id;
      }
      headingData.push({
        id,
        text: heading.textContent || "",
        level: parseInt(heading.tagName[1]),
      });
    });

    setHeadings(headingData);

    // Use a simple scroll listener — most reliable approach
    const handleScroll = () => {
      const scrollY = window.scrollY;
      let current = headingData[0]?.id ?? "";

      for (const h of headingData) {
        const el = document.getElementById(h.id);
        if (el) {
          // 120px offset accounts for fixed header
          if (el.getBoundingClientRect().top + window.scrollY <= scrollY + 120) {
            current = h.id;
          }
        }
      }

      setActiveId((prev) => {
        if (prev !== current) return current;
        return prev;
      });
    };

    handleScroll(); // set initial
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  // Whenever activeId changes, auto-scroll the TOC sidebar
  useEffect(() => {
    if (activeId) {
      scrollTocToActiveItem(activeId);
    }
  }, [activeId, scrollTocToActiveItem]);

  const handleClick = (id: string) => {
    const element = document.getElementById(id);
    if (element) {
      const top = element.getBoundingClientRect().top + window.scrollY - 100;
      window.scrollTo({ top, behavior: "smooth" });
    }
  };

  if (headings.length === 0) return null;

  return (
    <nav className="sticky top-24 hidden xl:block w-[260px] shrink-0">
      <div className="rounded-lg border border-border/50 bg-card/30 backdrop-blur-sm shadow-md">
        <div className="px-4 pt-4 pb-2">
          <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
            Table of Contents
          </h4>
        </div>
        <div
          ref={scrollContainerRef}
          className="max-h-[calc(100vh-180px)] overflow-y-auto scroll-smooth px-2 pb-4 scrollbar-thin scrollbar-thumb-border scrollbar-track-transparent"
        >
          <ul className="space-y-0.5 text-[13px]">
            {headings.map((heading) => (
              <li
                key={heading.id}
                ref={(el) => {
                  if (el) itemRefs.current.set(heading.id, el);
                }}
                className={cn(
                  "transition-all duration-200",
                  heading.level === 1 && "pl-0",
                  heading.level === 2 && "pl-1",
                  heading.level === 3 && "pl-4",
                  heading.level === 4 && "pl-7",
                  heading.level === 5 && "pl-9",
                  heading.level === 6 && "pl-11",
                )}
              >
                <button
                  onClick={() => handleClick(heading.id)}
                  className={cn(
                    "text-left w-full py-1.5 px-2.5 rounded-md transition-all duration-200",
                    "hover:text-foreground hover:bg-secondary/50",
                    "border-l-2",
                    activeId === heading.id
                      ? "text-primary font-medium bg-primary/10 border-l-primary"
                      : "text-muted-foreground border-l-transparent hover:border-l-muted-foreground/30"
                  )}
                >
                  <span className="block leading-snug" title={heading.text}>
                    {heading.text}
                  </span>
                </button>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </nav>
  );
};

export default TableOfContents;
