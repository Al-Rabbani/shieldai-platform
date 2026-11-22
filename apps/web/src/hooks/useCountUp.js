import { useEffect, useState, useRef } from "react";

const easeOutExpo = (t) => (t === 1 ? 1 : 1 - Math.pow(2, -10 * t));

export default function useCountUp(target, duration = 700) {
  const [value, setValue] = useState(0);
  const rafRef = useRef(null);

  useEffect(() => {
    const end = Number(target) || 0;
    const start = performance.now();
    cancelAnimationFrame(rafRef.current);

    function tick(now) {
      const elapsed = now - start;
      const progress = Math.min(1, elapsed / duration);
      setValue(end * easeOutExpo(progress));
      if (progress < 1) rafRef.current = requestAnimationFrame(tick);
    }
    rafRef.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafRef.current);
  }, [target, duration]);

  return value;
}