/**
 * Full-screen image viewer for article images.
 *
 * Zoom: wheel / trackpad pinch (zooms toward the cursor), touch pinch, double-click, + / - keys, buttons.
 * Pan: drag when zoomed. Navigate: ← / → keys, swipe, thumbnails. Also rotate, 1:1, download, open original.
 */
import { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import {
  X, ZoomIn, ZoomOut, Maximize, RotateCw, Download, ExternalLink, ChevronLeft, ChevronRight,
} from "lucide-react";
import { cn } from "@/lib/utils";

export interface ViewerImage {
  src: string;
  alt: string;
}

interface Props {
  images: ViewerImage[];
  index: number;
  onIndexChange: (i: number) => void;
  onClose: () => void;
}

const MIN = 0.2;
const MAX = 10;
const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));

/** Alt text worth showing: hide auto-generated names such as "Pasted image 20261014115743" or "IMG_1234". */
const caption = (alt: string) => (/^(pasted image|screenshot|img|image)[\s_-]*[\d\s._-]*$/i.test(alt.trim()) ? "" : alt);

type View = { scale: number; x: number; y: number };
/** Zoom to `next`, keeping the point (cx, cy) — relative to the stage centre — fixed on screen. At or below fit, re-centre. */
function zoomed(v: View, next: number, cx: number, cy: number): View {
  const n = clamp(next, MIN, MAX);
  if (n <= 1) return { scale: n, x: 0, y: 0 };
  const k = n / v.scale;
  return { scale: n, x: cx - (cx - v.x) * k, y: cy - (cy - v.y) * k };
}

export default function ImageViewer({ images, index, onIndexChange, onClose }: Props) {
  const image = images[index];
  const stageRef = useRef<HTMLDivElement>(null);
  const imgRef = useRef<HTMLImageElement>(null);
  // zoom and pan live together so every update is one consistent step
  const [view, setView] = useState({ scale: 1, x: 0, y: 0 });
  const { scale } = view;
  const offset = { x: view.x, y: view.y };
  const [rotation, setRotation] = useState(0);
  const [animate, setAnimate] = useState(true);
  const [loaded, setLoaded] = useState(false);
  const pointers = useRef(new Map<number, { x: number; y: number }>());
  const gesture = useRef<{ startDist: number; startScale: number; startX: number; startY: number; moved: boolean } | null>(null);

  const reset = useCallback(() => {
    setAnimate(true);
    setView({ scale: 1, x: 0, y: 0 });
  }, []);

  // New image: back to fit
  useEffect(() => {
    reset();
    setRotation(0);
    setLoaded(false);
  }, [index, reset]);

  /** Don't let the image be dragged out of sight: its centre stays within half its zoomed size of the middle. */
  const keepInView = (v: View): View => {
    const img = imgRef.current;
    if (!img) return v;
    const maxX = (img.clientWidth * v.scale) / 2;
    const maxY = (img.clientHeight * v.scale) / 2;
    return { ...v, x: clamp(v.x, -maxX, maxX), y: clamp(v.y, -maxY, maxY) };
  };

  const zoomTo = useCallback((next: number, cx = 0, cy = 0, smooth = true) => {
    setAnimate(smooth);
    setView((v) => zoomed(v, next, cx, cy));
  }, []);

  const relToCentre = (clientX: number, clientY: number) => {
    const r = stageRef.current!.getBoundingClientRect();
    return { x: clientX - (r.left + r.width / 2), y: clientY - (r.top + r.height / 2) };
  };

  const go = useCallback(
    (d: number) => {
      if (images.length < 2) return;
      onIndexChange((index + d + images.length) % images.length);
    },
    [images.length, index, onIndexChange]
  );

  const actualSize = () => {
    const img = imgRef.current;
    if (!img || !img.clientWidth) return;
    zoomTo(img.naturalWidth / img.clientWidth);
  };

  // Keyboard + scroll lock
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      else if (e.key === "ArrowRight") go(1);
      else if (e.key === "ArrowLeft") go(-1);
      else if (e.key === "+" || e.key === "=") zoomTo(scale * 1.4);
      else if (e.key === "-" || e.key === "_") zoomTo(scale / 1.4);
      else if (e.key === "0") reset();
      else if (e.key.toLowerCase() === "r") setRotation((r) => r + 90);
      else return;
      e.preventDefault();
    };
    window.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [go, onClose, reset, scale, zoomTo]);

  // Wheel / trackpad pinch (non-passive so the page doesn't scroll or browser-zoom)
  useEffect(() => {
    const el = stageRef.current;
    if (!el) return;
    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      const { x, y } = relToCentre(e.clientX, e.clientY);
      const factor = Math.exp(-e.deltaY * (e.ctrlKey ? 0.01 : 0.0015));
      setAnimate(false);
      setView((v) => zoomed(v, v.scale * factor, x, y));
    };
    el.addEventListener("wheel", onWheel, { passive: false });
    return () => el.removeEventListener("wheel", onWheel);
  }, []);

  /* ── pointer: drag to pan, two fingers to pinch, swipe to navigate ── */
  const onPointerDown = (e: React.PointerEvent) => {
    if ((e.target as HTMLElement).closest("button")) return;
    stageRef.current?.setPointerCapture(e.pointerId);
    pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
    const pts = [...pointers.current.values()];
    gesture.current = {
      startDist: pts.length === 2 ? Math.hypot(pts[0].x - pts[1].x, pts[0].y - pts[1].y) : 0,
      startScale: scale,
      startX: e.clientX,
      startY: e.clientY,
      moved: false,
    };
    setAnimate(false);
  };

  const onPointerMove = (e: React.PointerEvent) => {
    const prev = pointers.current.get(e.pointerId);
    if (!prev || !gesture.current) return;
    pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
    const pts = [...pointers.current.values()];
    if (pts.length === 2 && gesture.current.startDist) {
      const dist = Math.hypot(pts[0].x - pts[1].x, pts[0].y - pts[1].y);
      const mid = relToCentre((pts[0].x + pts[1].x) / 2, (pts[0].y + pts[1].y) / 2);
      zoomTo(gesture.current.startScale * (dist / gesture.current.startDist), mid.x, mid.y, false);
      gesture.current.moved = true;
      return;
    }
    const dx = e.clientX - prev.x;
    const dy = e.clientY - prev.y;
    if (Math.abs(e.clientX - gesture.current.startX) + Math.abs(e.clientY - gesture.current.startY) > 4) gesture.current.moved = true;
    if (scale > 1) setView((v) => keepInView({ ...v, x: v.x + dx, y: v.y + dy }));
  };

  const onPointerUp = (e: React.PointerEvent) => {
    const g = gesture.current;
    const single = pointers.current.size === 1;
    pointers.current.delete(e.pointerId);
    if (pointers.current.size > 0) return;
    gesture.current = null;
    if (!g) return;
    const dx = e.clientX - g.startX;
    const dy = e.clientY - g.startY;
    // swipe left/right at fit size: previous / next image
    if (single && scale <= 1.01 && Math.abs(dx) > 60 && Math.abs(dx) > Math.abs(dy) * 1.5) go(dx < 0 ? 1 : -1);
    // click on the dark backdrop (not the image) closes
    else if (!g.moved && e.target === stageRef.current) onClose();
  };

  const onDoubleClick = (e: React.MouseEvent) => {
    const p = relToCentre(e.clientX, e.clientY);
    if (scale > 1.05) reset();
    else zoomTo(2.5, p.x, p.y);
  };

  const download = async () => {
    const name = (image.alt || image.src.split("/").pop() || "image").replace(/[^\w.-]+/g, "-").slice(0, 80);
    try {
      const res = await fetch(image.src);
      const blob = await res.blob();
      const ext = blob.type.split("/")[1]?.replace("jpeg", "jpg") ?? "png";
      const url = URL.createObjectURL(blob);
      const a = Object.assign(document.createElement("a"), { href: url, download: name.includes(".") ? name : `${name}.${ext}` });
      a.click();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
    } catch {
      window.open(image.src, "_blank", "noopener");
    }
  };

  if (!image) return null;

  const btn = "inline-flex items-center justify-center h-9 w-9 rounded-md text-white/80 hover:text-white hover:bg-white/10 transition-colors";

  return createPortal(
    <div className="fixed inset-0 z-[100] flex flex-col bg-neutral-950 select-none animate-in fade-in duration-150" role="dialog" aria-modal="true" aria-label="Image viewer">
      {/* Top bar */}
      <div className="shrink-0 flex items-center gap-1 h-14 px-3 sm:px-4 text-white">
        <div className="min-w-0 flex-1 flex items-baseline gap-3">
          {images.length > 1 && <span className="shrink-0 text-[13px] tabular-nums text-white/60">{index + 1} / {images.length}</span>}
          <span className="truncate text-[14px] text-white/90">{caption(image.alt)}</span>
        </div>
        <button type="button" className={btn} onClick={() => zoomTo(scale / 1.4)} title="Zoom out (−)" aria-label="Zoom out"><ZoomOut className="w-[18px] h-[18px]" /></button>
        <button type="button" onClick={reset} className="h-9 min-w-[56px] px-2 rounded-md text-[13px] tabular-nums text-white/80 hover:bg-white/10" title="Fit to screen (0)">
          {Math.round(scale * 100)}%
        </button>
        <button type="button" className={btn} onClick={() => zoomTo(scale * 1.4)} title="Zoom in (+)" aria-label="Zoom in"><ZoomIn className="w-[18px] h-[18px]" /></button>
        <span className="hidden sm:block w-px h-5 bg-white/15 mx-1" />
        <button type="button" className={cn(btn, "hidden sm:inline-flex")} onClick={reset} title="Fit to screen (0)" aria-label="Fit to screen"><Maximize className="w-[18px] h-[18px]" /></button>
        <button type="button" className={cn(btn, "hidden sm:inline-flex w-auto px-2 text-[12px] font-semibold tabular-nums")} onClick={actualSize} title="Actual size" aria-label="Actual size">1:1</button>
        <button type="button" className={btn} onClick={() => { setAnimate(true); setRotation((r) => r + 90); }} title="Rotate (R)" aria-label="Rotate"><RotateCw className="w-[18px] h-[18px]" /></button>
        <button type="button" className={cn(btn, "hidden sm:inline-flex")} onClick={download} title="Download" aria-label="Download"><Download className="w-[18px] h-[18px]" /></button>
        <a className={cn(btn, "hidden sm:inline-flex")} href={image.src} target="_blank" rel="noopener noreferrer" title="Open original in a new tab" aria-label="Open original"><ExternalLink className="w-[18px] h-[18px]" /></a>
        <span className="w-px h-5 bg-white/15 mx-1" />
        <button type="button" className={btn} onClick={onClose} title="Close (Esc)" aria-label="Close"><X className="w-5 h-5" /></button>
      </div>

      {/* Stage */}
      <div
        ref={stageRef}
        className={cn("relative flex-1 min-h-0 flex items-center justify-center overflow-hidden touch-none", scale > 1 ? "cursor-grab active:cursor-grabbing" : "cursor-zoom-in")}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
        onDoubleClick={onDoubleClick}
      >
        {!loaded && <div className="absolute w-8 h-8 rounded-full border-2 border-white/20 border-t-white/80 animate-spin" />}
        <img
          ref={imgRef}
          key={image.src}
          src={image.src}
          alt={image.alt}
          draggable={false}
          onLoad={() => setLoaded(true)}
          className={cn("max-w-[calc(100vw-2rem)] max-h-full object-contain rounded-sm shadow-2xl bg-white/5", !loaded && "opacity-0")}
          style={{
            transform: `translate3d(${offset.x}px, ${offset.y}px, 0) scale(${scale}) rotate(${rotation}deg)`,
            transition: animate ? "transform 180ms ease-out, opacity 150ms" : "opacity 150ms",
          }}
        />

        {images.length > 1 && (
          <>
            <button type="button" onClick={() => go(-1)} className="absolute left-2 sm:left-4 top-1/2 -translate-y-1/2 h-11 w-11 rounded-full bg-black/40 text-white/80 hover:text-white hover:bg-black/60 hidden sm:flex items-center justify-center" title="Previous (←)" aria-label="Previous image">
              <ChevronLeft className="w-6 h-6" />
            </button>
            <button type="button" onClick={() => go(1)} className="absolute right-2 sm:right-4 top-1/2 -translate-y-1/2 h-11 w-11 rounded-full bg-black/40 text-white/80 hover:text-white hover:bg-black/60 hidden sm:flex items-center justify-center" title="Next (→)" aria-label="Next image">
              <ChevronRight className="w-6 h-6" />
            </button>
          </>
        )}
      </div>

      {/* Thumbnails + hint */}
      <div className="shrink-0 pb-3 pt-2">
        {images.length > 1 && (
          <div className="flex justify-center gap-2 px-4 overflow-x-auto [scrollbar-width:none]">
            {images.map((im, i) => (
              <button
                key={im.src + i}
                type="button"
                onClick={() => onIndexChange(i)}
                className={cn("shrink-0 h-12 w-16 rounded overflow-hidden border-2 transition-opacity", i === index ? "border-white opacity-100" : "border-transparent opacity-50 hover:opacity-90")}
                aria-label={`Image ${i + 1}${im.alt ? `: ${im.alt}` : ""}`}
              >
                <img src={im.src} alt="" className="h-full w-full object-cover bg-white/10" loading="lazy" />
              </button>
            ))}
          </div>
        )}
        <p className="hidden sm:block mt-2 text-center text-[12px] text-white/40">
          Scroll or pinch to zoom · drag to move · double-click to zoom in/out · ← → to switch · R rotate · Esc close
        </p>
      </div>
    </div>,
    document.body
  );
}
