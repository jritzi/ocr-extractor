import { setIcon } from "obsidian";
import { useEffect, useRef } from "react";

export function useIcon<T extends HTMLElement>(name: string) {
  const ref = useRef<T>(null);

  useEffect(() => {
    if (ref.current) setIcon(ref.current, name);
  }, [name]);

  return ref;
}
