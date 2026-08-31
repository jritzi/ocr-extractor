import { extname } from "path";

const SUPPORTED_EXTENSIONS = [".pdf", ".png", ".jpg", ".jpeg", ".webp"];

export function isSupportedAttachment(inputPath) {
  return SUPPORTED_EXTENSIONS.includes(extname(inputPath).toLowerCase());
}
