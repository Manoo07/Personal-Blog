/**
 * Inline PDF reader for posts. Written in markdown as an embed, like Obsidian's ![[paper.pdf]]:
 *
 *     ![Dynamo: Amazon's Highly Available Key-value Store](https://…/api/images/<id>.pdf)
 *
 * Shows the PDF in the browser's own viewer (iframe) with a title bar: full screen, open in a
 * new tab, download. Browsers that can't display PDFs inline (most phones) get an "Open PDF" card.
 *
 * Built from <span>s styled as blocks: markdown puts embeds inside a <p>, where <div> isn't allowed.
 */
import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { FileText, Maximize2, Minimize2, ExternalLink, Download, X } from "lucide-react";
import { cn } from "@/lib/utils";

interface Props {
  src: string;
  title?: string;
}

const pdfName = (src: string, title?: string) =>
  title?.trim() || decodeURIComponent(src.split(/[?#]/)[0].split("/").pop() || "document.pdf");

async function downloadPdf(src: string, name: string) {
  try {
    const blob = await (await fetch(src)).blob();
    const url = URL.createObjectURL(blob);
    Object.assign(document.createElement("a"), { href: url, download: /\.pdf$/i.test(name) ? name : `${name}.pdf` }).click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  } catch {
    window.open(src, "_blank", "noopener");
  }
}

export default function PdfEmbed({ src, title }: Props) {
  const name = pdfName(src, title);
  const [fullscreen, setFullscreen] = useState(false);
  // navigator.pdfViewerEnabled: false on browsers that would download instead of display (e.g. Android Chrome)
  const [inline] = useState(() => typeof navigator === "undefined" || navigator.pdfViewerEnabled !== false);
  // fit page width, start with the thumbnail sidebar closed (readers can still open it)
  const viewerSrc = `${src.split("#")[0]}#view=FitH&navpanes=0`;
  const open = () => window.open(src, "_blank", "noopener");

  useEffect(() => {
    if (!fullscreen) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setFullscreen(false);
    window.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [fullscreen]);

  const btn = "inline-flex items-center justify-center h-8 w-8 rounded-md text-muted-foreground hover:text-foreground hover:bg-accent/70 transition-colors";

  const bar = (
    <span className="flex items-center gap-2 h-11 pl-3 pr-1.5 border-b border-border bg-secondary/70">
      <FileText className="w-4 h-4 shrink-0 text-primary" />
      <span className="min-w-0 flex-1 truncate text-[14px] font-medium text-foreground" title={name}>{name}</span>
      <span className="shrink-0 text-[11px] font-semibold tracking-wide text-muted-foreground/80 mr-1">PDF</span>
      {inline && (
        <button type="button" className={btn} onClick={() => setFullscreen((f) => !f)} title={fullscreen ? "Exit full screen (Esc)" : "Full screen"} aria-label={fullscreen ? "Exit full screen" : "Full screen"}>
          {fullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
        </button>
      )}
      <button type="button" className={btn} onClick={open} title="Open in a new tab" aria-label="Open in a new tab">
        <ExternalLink className="w-4 h-4" />
      </button>
      <button type="button" className={btn} onClick={() => downloadPdf(src, name)} title="Download" aria-label="Download">
        <Download className="w-4 h-4" />
      </button>
      {fullscreen && (
        <button type="button" className={btn} onClick={() => setFullscreen(false)} title="Close (Esc)" aria-label="Close">
          <X className="w-4 h-4" />
        </button>
      )}
    </span>
  );

  if (!inline) {
    return (
      <span className="pdf-embed block my-5 rounded-lg border border-border overflow-hidden bg-card">
        {bar}
        <span className="flex flex-col items-center gap-3 px-4 py-8 text-center">
          <FileText className="w-10 h-10 text-primary/70" strokeWidth={1.5} />
          <span className="text-[14px] text-muted-foreground">Your browser opens PDFs in its own viewer.</span>
          <button type="button" onClick={open} className="inline-flex items-center gap-2 h-9 px-4 rounded-md bg-primary text-primary-foreground text-[14px] font-medium hover:opacity-90">
            <ExternalLink className="w-4 h-4" /> Open PDF
          </button>
        </span>
      </span>
    );
  }

  const frame = (
    <iframe
      src={viewerSrc}
      title={name}
      loading="lazy"
      className={cn("block w-full border-0 bg-white", fullscreen ? "flex-1" : "h-[75vh] min-h-[460px] max-h-[920px]")}
    />
  );

  return (
    <>
      <span className="pdf-embed block my-5 rounded-lg border border-border overflow-hidden bg-card shadow-sm">
        {bar}
        {!fullscreen && frame}
        {fullscreen && (
          <span className="flex items-center justify-center h-24 text-[13px] text-muted-foreground">Open in full screen — press Esc to return</span>
        )}
      </span>
      {fullscreen &&
        createPortal(
          <div className="fixed inset-0 z-[90] flex flex-col bg-background" role="dialog" aria-modal="true" aria-label={name}>
            {bar}
            {frame}
          </div>,
          document.body
        )}
    </>
  );
}
