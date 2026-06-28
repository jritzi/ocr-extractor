import process from "node:process";

const userAgent = process.env.npm_config_user_agent ?? "";

if (!userAgent.startsWith("pnpm")) {
  throw new Error("Use `pnpm publish` to publish this package, not npm");
}
