import React, { useRef, useCallback } from "react";

export default function MagneticCard({ children, className = "", strength = 6, as: Tag = "div", ...rest }) {
  const ref = useRef(null);
  const rafRef = useRef(null);

  const handleMouseMove = useCallback((e) => {
    if (rafRef.current) return;
    rafRef.current = requestAnimationFrame(() => {
      rafRef.current = null;
      const el = ref.current;
      if (!el) return;
      const rect = el.getBoundingClientRect();
      const cx = rect.left + rect.width / 2;
      const cy = rect.top + rect.height / 2;
      const dx = (e.clientX - cx) / (rect.width / 2);
      const dy = (e.clientY - cy) / (rect.height / 2);
      el.style.transform = `translate(${dx * strength}px, ${dy * strength}px)`;
    });
  }, [strength]);

  const handleMouseLeave = useCallback(() => {
    if (ref.current) ref.current.style.transform = "translate(0px, 0px)";
  }, []);

  return (
    <Tag ref={ref} onMouseMove={handleMouseMove} onMouseLeave={handleMouseLeave}
      className={`transition-transform duration-300 ease-out ${className}`} {...rest}>
      {children}
    </Tag>
  );
}