import { useEffect, useRef, useState } from 'react';

// Conta suavemente até ao valor (easeOutCubic). Usa o formatador dado.
// Respeita prefers-reduced-motion (salta direto ao valor final).
export function AnimatedNumber({ value, format = (n) => String(n), duration = 700, className }) {
  const [display, setDisplay] = useState(Number(value) || 0);
  const fromRef = useRef(Number(value) || 0);
  const rafRef = useRef(0);

  useEffect(() => {
    const target = Number(value);
    const reduce = typeof window !== 'undefined'
      && window.matchMedia
      && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    if (!isFinite(target) || reduce) {
      setDisplay(target);
      fromRef.current = isFinite(target) ? target : 0;
      return;
    }

    const from = Number(fromRef.current) || 0;
    const start = performance.now();
    const ease = (t) => 1 - Math.pow(1 - t, 3);

    cancelAnimationFrame(rafRef.current);
    const tick = (now) => {
      const p = Math.min(1, (now - start) / duration);
      setDisplay(from + (target - from) * ease(p));
      if (p < 1) {
        rafRef.current = requestAnimationFrame(tick);
      } else {
        setDisplay(target);
        fromRef.current = target;
      }
    };
    rafRef.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafRef.current);
  }, [value, duration]);

  return <span className={className}>{format(display)}</span>;
}
