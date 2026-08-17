import { setTooltip } from "obsidian";
import { useEffect, useRef } from "react";

// Ensure the tooltip always stays in the viewport (side positions can clip)
const PLACEMENT = { placement: "bottom" } as const;

export function useTooltip<T extends HTMLElement>(text: string) {
  const ref = useRef<T>(null);

  useEffect(() => {
    if (ref.current) setTooltip(ref.current, text, PLACEMENT);
  }, [text]);

  return ref;
}

export function useOverflowTooltip<T extends HTMLElement>(text: string) {
  const ref = useRef<T>(null);

  useEffect(() => {
    const element = ref.current;
    if (!element) return;

    const show = () => {
      const truncated = element.scrollWidth > element.clientWidth;
      setTooltip(element, truncated ? text : "", PLACEMENT);
    };

    element.addEventListener("pointerenter", show);
    return () => element.removeEventListener("pointerenter", show);
  }, [text]);

  return ref;
}
