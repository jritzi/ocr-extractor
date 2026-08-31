import clsx from "clsx";
import { RunStatus } from "../../../reporting/run-report";
import { useIcon } from "../../hooks/use-icon";
import "./status-icon.css";

const STATUS_ICON: Record<RunStatus, string> = {
  running: "loader-circle",
  canceling: "loader-circle",
  complete: "circle-check",
  fatal: "circle-x",
  canceled: "circle-slash",
};

interface StatusIconProps {
  status: RunStatus;
}

export function StatusIcon({ status }: StatusIconProps) {
  const ref = useIcon<HTMLSpanElement>(STATUS_ICON[status]);
  const spinning = status === "running" || status === "canceling";

  return (
    <span
      ref={ref}
      className={clsx(
        "ocr-extractor-report-status-icon",
        spinning && "ocr-extractor-spinning",
        status === "fatal" && "ocr-extractor-report-status-icon-error",
      )}
      aria-hidden="true"
    />
  );
}
