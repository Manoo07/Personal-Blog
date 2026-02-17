import { useEffect, useState, useCallback } from "react";
import { cn } from "@/lib/utils";
import { ChevronRight } from "lucide-react";

interface Heading {
  id: string;
  text: string;
  level: number;
}

interface BlogSidebarProps {
  content: string;
}

const BlogSidebar = ({ content }: BlogSidebarProps) => {
  const [headings, setHeadings] = useState<Heading[]>([]);
  const [activeId, setActiveId] = useState<string>("");

  // Parse headings from rendered markdown content
  const parseHeadings = useCallback(() => {
    const article = document.querySelector("article .prose");
    if (!article) return;

    const headingElements = article.querySelectorAll("h2, h3, h4");
    const headingData: Heading[] = [];

    headingElements.forEach((heading, index) => {
      // Generate a slug from the heading text
      const text = heading.textContent || "";
      const slug = text
        .toLowerCase()
        .replace(/[^a-z0-9\s-]/g, "")
        .replace(/\s+/g, "-")
        .replace(/-+/g, "-")
        .trim();
      
      const id = `heading-${slug}-${index}`;
      heading.id = id;

      headingData.push({
        id,
        text: text,
        level: parseInt(heading.tagName[1]),
      });
    });

    setHeadings(headingData);

    // Set initial active heading
    if (headingData.length > 0) {
      setActiveId(headingData[0].id);
    }
  }, []);

  useEffect(() => {
    // Wait for markdown to render
    const timer = setTimeout(parseHeadings, 150);
    return () => clearTimeout(timer);
  }, [content, parseHeadings]);

  useEffect(() => {
    if (headings.length === 0) return;

    // Set up intersection observer for active heading
    const observer = new IntersectionObserver(
      (entries) => {
        // Find the entry that is most visible
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setActiveId(entry.target.id);
          }
        });
      },
      {
        rootMargin: "-100px 0px -70% 0px",
        threshold: 0,
      }
    );

    headings.forEach((heading) => {
      const element = document.getElementById(heading.id);
      if (element) {
        observer.observe(element);
      }
    });

    return () => {
      observer.disconnect();
    };
  }, [headings]);

  const handleClick = (id: string) => {
    const element = document.getElementById(id);
    if (element) {
      const top = element.getBoundingClientRect().top + window.scrollY - 100;
      window.scrollTo({ top, behavior: "smooth" });
      setActiveId(id);
    }
  };

  if (headings.length === 0) return null;

  // Group headings by their parent h2
  const groupedHeadings: { parent: Heading; children: Heading[] }[] = [];
  let currentGroup: { parent: Heading; children: Heading[] } | null = null;

  headings.forEach((heading) => {
    if (heading.level === 2) {
      if (currentGroup) {
        groupedHeadings.push(currentGroup);
      }
      currentGroup = { parent: heading, children: [] };
    } else if (currentGroup) {
      currentGroup.children.push(heading);
    }
  });

  if (currentGroup) {
    groupedHeadings.push(currentGroup);
  }

  // Check if active heading is in a group
  const isActiveInGroup = (group: { parent: Heading; children: Heading[] }) => {
    return (
      group.parent.id === activeId ||
      group.children.some((child) => child.id === activeId)
    );
  };

  return (
    <aside className="hidden lg:block">
      <nav className="fixed top-24 right-4 xl:right-8 w-48 xl:w-52 max-h-[calc(100vh-120px)] overflow-y-auto scrollbar-thin">
        <div className="rounded-lg border border-border/40 bg-card/50 backdrop-blur-sm p-3">
          <h4 className="text-[9px] font-semibold text-muted-foreground uppercase tracking-wider mb-2">
            On This Page
          </h4>
          
          <ul className="space-y-0.5 text-[11px]">
            {groupedHeadings.map((group, groupIndex) => (
              <li key={group.parent.id}>
                {/* Parent heading (h2) */}
                <button
                  onClick={() => handleClick(group.parent.id)}
                  className={cn(
                    "text-left w-full py-0.5 px-1.5 rounded transition-all duration-200 flex items-start gap-1",
                    "hover:text-primary",
                    activeId === group.parent.id
                      ? "text-primary font-medium"
                      : "text-muted-foreground"
                  )}
                >
                  <span className="text-[10px] text-muted-foreground/60 w-3 flex-shrink-0">
                    {groupIndex + 1}.
                  </span>
                  <span className="line-clamp-2 leading-snug">{group.parent.text}</span>
                </button>

                {/* Children headings (h3, h4) */}
                {group.children.length > 0 && (
                  <ul
                    className={cn(
                      "ml-3 mt-0.5 space-y-0 border-l pl-2 transition-all duration-200",
                      isActiveInGroup(group) 
                        ? "border-primary/40 opacity-100" 
                        : "border-border/30 opacity-60"
                    )}
                  >
                    {group.children.map((child) => (
                      <li key={child.id}>
                        <button
                          onClick={() => handleClick(child.id)}
                          className={cn(
                            "text-left w-full py-0.5 px-1 rounded transition-all duration-200 text-[10px]",
                            "hover:text-primary",
                            child.level === 4 && "pl-2",
                            activeId === child.id
                              ? "text-primary font-medium"
                              : "text-muted-foreground"
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
      </nav>
    </aside>
  );
};

export default BlogSidebar;
