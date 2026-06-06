import { Platform } from "obsidian";
import { UserFacingError } from "../ocr-service";
import { debugLog } from "../../utils/logging";
import { t } from "../../i18n";

const COMMAND_TIMEOUT = 120_000; // 2 minutes

export class CustomCommandRunner {
  private readonly fs: typeof import("fs/promises");
  private readonly os: typeof import("os");
  private readonly path: typeof import("path");
  private readonly crypto: typeof import("crypto");
  private readonly execAsync: (
    cmd: string,
    opts: import("child_process").ExecOptions,
  ) => Promise<{ stdout: string; stderr: string }>;

  constructor() {
    if (!Platform.isDesktop) {
      throw new Error("CustomCommandRunner is only available on desktop");
    }

    this.fs = require("fs/promises") as typeof this.fs;
    this.os = require("os") as typeof this.os;
    this.path = require("path") as typeof this.path;
    this.crypto = require("crypto") as typeof this.crypto;
    const util = require("util") as typeof import("util");
    const childProcess =
      require("child_process") as typeof import("child_process");
    this.execAsync = util.promisify(childProcess.exec);
  }

  /**
   * Writes data to a temp file, runs the command against it, and returns the
   * text output, or null if the command produced no output file.
   */
  async run(
    data: Uint8Array,
    command: string,
    extension: string,
    signal: AbortSignal,
  ) {
    const { inputPath, outputPath } = this.getTmpPaths(extension);

    try {
      await this.fs.writeFile(inputPath, data);
      await this.runCommand(command, inputPath, outputPath, signal);
      return await this.readOutput(outputPath);
    } finally {
      await Promise.allSettled([
        this.fs.unlink(inputPath),
        this.fs.unlink(outputPath),
      ]);
    }
  }

  /**
   * Get input and output file tmp paths, using UUIDs for filenames and
   * sanitizing the input extension, to prevent command injection from
   * unsafe characters in original filenames.
   */
  private getTmpPaths(extension: string) {
    const uuid = this.crypto.randomUUID();
    const sanitizedExt = extension.replace(/[^a-zA-Z0-9]/g, "");

    return {
      inputPath: this.path.join(
        this.os.tmpdir(),
        sanitizedExt ? `input-${uuid}.${sanitizedExt}` : `input-${uuid}`,
      ),
      outputPath: this.path.join(this.os.tmpdir(), `output-${uuid}.md`),
    };
  }

  private async runCommand(
    command: string,
    inputPath: string,
    outputPath: string,
    signal: AbortSignal,
  ) {
    // Quote paths to handle spaces in tmp path (e.g. on Windows)
    const resolvedCommand = command
      .replace(/\{input}/g, `"${inputPath}"`)
      .replace(/\{output}/g, `"${outputPath}"`);

    try {
      await this.execAsync(resolvedCommand, {
        timeout: COMMAND_TIMEOUT,
        signal,
      });
    } catch (error) {
      if (signal.aborted) throw error;

      const { killed, code, message, stderr } = error as {
        killed?: boolean;
        code?: number;
        message: string;
        stderr?: string;
      };
      console.error(
        `Custom command failed (exit code ${code}):`,
        stderr?.trim() || message,
      );

      if (killed) {
        throw new UserFacingError(t("errors.commandTimeout"));
      }
      throw new UserFacingError(
        t("errors.commandFailed", { code: String(code) }),
      );
    }
  }

  private async readOutput(outputPath: string) {
    let output: string;
    try {
      output = await this.fs.readFile(outputPath, "utf-8");
    } catch {
      // Skip attachment if no output file produced
      debugLog("Custom command produced no output file");
      return null;
    }

    if (!output.trim()) {
      debugLog("Custom command output file was empty");
    }
    return output;
  }
}
