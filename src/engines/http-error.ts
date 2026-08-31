import { FatalError } from "./ocr-engine";
import { t } from "../i18n";

export function throwIfFatalHttpStatus(
  status: number | undefined,
  cause: unknown,
) {
  if (status === 401 || status === 403) {
    throw new FatalError(t("errors.unauthorized"), { cause });
  }
  if (status === 429) {
    throw new FatalError(t("errors.rateLimited"), { cause });
  }
  if (status !== undefined && status >= 500) {
    throw new FatalError(t("errors.serverError", { status }), { cause });
  }
}
