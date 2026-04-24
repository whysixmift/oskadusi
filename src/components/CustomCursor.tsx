import { useEffect, useRef, useState } from "react";

export function CustomCursor() {
  const dotRef = useRef<HTMLDivElement>(null);
  const ringRef = useRef<HTMLDivElement>(null);
  const [isHovering, setIsHovering] = useState(false);
  const [isVisible, setIsVisible] = useState(false);
  const pos = useRef({ x: -100, y: -100 });
  const ringPos = useRef({ x: -100, y: -100 });
  const rafRef = useRef<number | undefined>(undefined);

  useEffect(() => {
    if (window.matchMedia("(pointer: coarse)").matches) return;

    setIsVisible(true);

    const moveDot = (e: MouseEvent) => {
      pos.current = { x: e.clientX, y: e.clientY };
      if (dotRef.current) {
        dotRef.current.style.transform = `translate(${e.clientX - 4}px, ${e.clientY - 4}px)`;
      }
    };

    const animateRing = () => {
      ringPos.current.x += (pos.current.x - ringPos.current.x) * 0.12;
      ringPos.current.y += (pos.current.y - ringPos.current.y) * 0.12;
      if (ringRef.current) {
        const size = isHovering ? 40 : 28;
        ringRef.current.style.transform = `translate(${ringPos.current.x - size / 2}px, ${ringPos.current.y - size / 2}px)`;
      }
      rafRef.current = requestAnimationFrame(animateRing);
    };

    rafRef.current = requestAnimationFrame(animateRing);

    const onOver = (e: MouseEvent) => {
      const t = e.target as HTMLElement;
      if (
        t.tagName === "A" ||
        t.tagName === "BUTTON" ||
        t.closest("a") ||
        t.closest("button") ||
        t.dataset.hover === "true"
      ) {
        setIsHovering(true);
      }
    };

    const onOut = (e: MouseEvent) => {
      const t = e.target as HTMLElement;
      if (
        t.tagName === "A" ||
        t.tagName === "BUTTON" ||
        t.closest("a") ||
        t.closest("button") ||
        t.dataset.hover === "true"
      ) {
        setIsHovering(false);
      }
    };

    window.addEventListener("mousemove", moveDot, { passive: true });
    document.addEventListener("mouseover", onOver, { passive: true });
    document.addEventListener("mouseout", onOut, { passive: true });

    return () => {
      window.removeEventListener("mousemove", moveDot);
      document.removeEventListener("mouseover", onOver);
      document.removeEventListener("mouseout", onOut);
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [isHovering]);

  if (!isVisible) return null;

  return (
    <>
      {/* Dot — snaps instantly to cursor */}
      <div
        ref={dotRef}
        className="fixed top-0 left-0 pointer-events-none z-[10001]"
        style={{
          width: 8,
          height: 8,
          borderRadius: "50%",
          background: "#ea0000",
          willChange: "transform",
        }}
      />

      {/* Ring — follows with slight lag */}
      <div
        ref={ringRef}
        className="fixed top-0 left-0 pointer-events-none z-[10000] transition-[width,height,border-color,opacity] duration-200"
        style={{
          width: isHovering ? 40 : 28,
          height: isHovering ? 40 : 28,
          borderRadius: "50%",
          border: `1.5px solid ${isHovering ? "#ea0000" : "rgba(255,255,255,0.7)"}`,
          background: isHovering ? "rgba(234,0,0,0.08)" : "transparent",
          willChange: "transform",
        }}
      />
    </>
  );
}
