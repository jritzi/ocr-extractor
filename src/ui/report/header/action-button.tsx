import { MouseEvent } from "react";
import clsx from "clsx";
import { useIcon } from "../../hooks/use-icon";

interface ActionButtonProps {
  icon: string;
  label: string;
  onClick: (event: MouseEvent) => void;
  disabled: boolean;
  active?: boolean;
}

export function ActionButton({
  icon,
  label,
  onClick,
  disabled,
  active,
}: ActionButtonProps) {
  const ref = useIcon<HTMLButtonElement>(icon);

  return (
    <button
      ref={ref}
      type="button"
      className={clsx(
        "clickable-icon nav-action-button",
        active && !disabled && "is-active",
      )}
      aria-label={label}
      disabled={disabled}
      // Obsidian uses `aria-disabled` for styling
      aria-disabled={disabled}
      onClick={onClick}
    />
  );
}
