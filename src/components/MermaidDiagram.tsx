import { useEffect, useId, useState } from "react";
import mermaid from "mermaid";
import { AlertTriangle } from "lucide-react";

mermaid.initialize({
  startOnLoad: false,
  securityLevel: "strict",
  // Never let mermaid inject its own "Syntax error in text" SVG into the page
  suppressErrorRendering: true,
  theme: "base",
  fontFamily: 'ui-sans-serif, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
  themeVariables: {
    background: "#e7e7e7",
    primaryColor: "#dbe7f6",
    primaryBorderColor: "#2170c9",
    primaryTextColor: "#1a2023",
    secondaryColor: "#e3e3e3",
    tertiaryColor: "#efefef",
    lineColor: "#5c5c5c",
    textColor: "#1a2023",
    noteBkgColor: "#f3ecd2",
    noteBorderColor: "#c9b77a",
    fontSize: "14px",
  },
});

interface MermaidDiagramProps {
  code: string;
}

/** Remove any temporary nodes mermaid appends to <body> while rendering. */
function cleanup(id: string) {
  document.getElementById(id)?.remove();
  document.getElementById(`d${id}`)?.remove();
}

const MermaidDiagram = ({ code }: MermaidDiagramProps) => {
  const reactId = useId();
  const [svg, setSvg] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    // useId contains ":" which isn't valid in a CSS selector mermaid builds
    const id = `mermaid-${reactId.replace(/[^a-zA-Z0-9_-]/g, "")}`;

    (async () => {
      try {
        await mermaid.parse(code.trim());
        const { svg } = await mermaid.render(id, code.trim());
        if (!cancelled) {
          setSvg(svg);
          setError(null);
        }
      } catch (err) {
        if (!cancelled) {
          setSvg(null);
          setError(err instanceof Error ? err.message : String(err));
        }
      } finally {
        cleanup(id);
      }
    })();

    return () => {
      cancelled = true;
      cleanup(id);
    };
  }, [code, reactId]);

  if (error) {
    return (
      <div className="my-3 rounded-[6px] border border-border bg-secondary/70 not-prose">
        <div className="flex items-center gap-2 px-3 py-2 text-[13px] text-foreground border-b border-border">
          <AlertTriangle className="w-4 h-4 text-[hsl(var(--mark-fg))]" />
          This diagram couldn't be rendered
        </div>
        <pre className="!m-0 !rounded-none !rounded-b-[6px] max-h-64 overflow-auto text-[12.5px]">
          <code>{code.trim()}</code>
        </pre>
      </div>
    );
  }

  return (
    <div
      className="my-3 flex justify-center overflow-x-auto [&_svg]:max-w-full [&_svg]:h-auto"
      // svg produced by mermaid with securityLevel "strict"
      dangerouslySetInnerHTML={svg ? { __html: svg } : undefined}
    />
  );
};

export default MermaidDiagram;
