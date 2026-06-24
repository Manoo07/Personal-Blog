import { useEffect, useRef, useState } from "react";
import mermaid from "mermaid";

mermaid.initialize({
  startOnLoad: false,
  theme: "default",
  securityLevel: "loose",
});

let idCounter = 0;

interface MermaidDiagramProps {
  code: string;
}

const MermaidDiagram = ({ code }: MermaidDiagramProps) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [error, setError] = useState<string | null>(null);
  const idRef = useRef(`mermaid-${++idCounter}`);

  useEffect(() => {
    const render = async () => {
      if (!containerRef.current) return;
      setError(null);
      try {
        const { svg } = await mermaid.render(idRef.current, code.trim());
        if (containerRef.current) {
          containerRef.current.innerHTML = svg;
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to render diagram");
      }
    };
    render();
  }, [code]);

  if (error) {
    return (
      <div className="rounded-lg border border-destructive/40 bg-destructive/5 p-4 text-sm text-destructive font-mono">
        <p className="font-semibold mb-1">Mermaid render error</p>
        <p className="opacity-80">{error}</p>
      </div>
    );
  }

  return (
    <div className="my-6 flex justify-center overflow-x-auto rounded-lg border border-border/40 bg-muted/30 p-4">
      <div ref={containerRef} className="mermaid-output" />
    </div>
  );
};

export default MermaidDiagram;
