/* eslint-disable @typescript-eslint/no-require-imports, import/no-nodejs-modules -- Node modules are only loaded (with require()) when Platform.isDesktop */

import type { SettingGroup } from "obsidian";
import { Platform } from "obsidian";
import { OcrService, UserFacingError } from "./ocr-service";
import type OcrExtractorPlugin from "../../main";
import { PluginSettings } from "../settings";
import { assert } from "../utils/assert";
import {
  showErrorNotice,
  showLoadingNotice,
  showSuccessNotice,
} from "../utils/notice";
import { convertPdfToImages } from "../utils/pdf";

const COMMAND_TIMEOUT = 120_000; // 2 minutes

export class CustomCommandService extends OcrService {
  static readonly label = "Custom command";

  private readonly fs: typeof import("fs/promises");
  private readonly os: typeof import("os");
  private readonly path: typeof import("path");
  private readonly crypto: typeof import("crypto");
  private readonly execAsync: (
    cmd: string,
    opts: import("child_process").ExecOptions,
  ) => Promise<{ stdout: string; stderr: string }>;

  constructor(settings: PluginSettings) {
    super(settings);
    assert(Platform.isDesktop, "Service only instantiated on desktop");

    this.fs = require("fs/promises") as typeof this.fs;
    this.os = require("os") as typeof this.os;
    this.path = require("path") as typeof this.path;
    this.crypto = require("crypto") as typeof this.crypto;
    const util = require("util") as typeof import("util");
    const childProcess =
      require("child_process") as typeof import("child_process");
    this.execAsync = util.promisify(childProcess.exec) as typeof this.execAsync;
  }

  static addSettings(
    group: SettingGroup,
    settings: PluginSettings,
    saveSetting: OcrExtractorPlugin["saveSetting"],
  ) {
    group.addSetting((setting) => {
      setting
        .setName("Command")
        .setDesc(
          "Shell command to execute (desktop-only, Tesseract will be used instead on mobile), using {input} and {output} for the file paths",
        )
        .addTextArea((text) =>
          text
            .setPlaceholder("command.sh -i {input} -o {output}")
            .setValue(settings.customCommand)
            .onChange((value) => void saveSetting("customCommand", value)),
        )
        .addButton((button) =>
          button
            .setButtonText("Test")
            .setTooltip("Test command with a sample image")
            .setDisabled(!Platform.isDesktop)
            .onClick(() => void this.testCommand(settings)),
        );
    });

    group.addSetting((setting) => {
      setting
        .setName("Convert PDFs to images")
        .setDesc("Convert PDF pages to PNG images before processing")
        .addToggle((toggle) =>
          toggle
            .setValue(settings.customCommandConvertPdfs)
            .onChange(
              (value) => void saveSetting("customCommandConvertPdfs", value),
            ),
        );
    });
  }

  private static async testCommand(settings: PluginSettings) {
    const testPng = await this.createTestImage();
    const service = new CustomCommandService(settings);
    const loadingNotice = showLoadingNotice("Testing custom command...");

    try {
      await service.processOcr(testPng, "test.png");
      showSuccessNotice("Test succeeded");
    } catch (error) {
      if (error instanceof UserFacingError) {
        showErrorNotice(`Test failed: ${error.message}`);
      } else {
        console.error("Custom command test failed:", error);
        showErrorNotice("Test failed: Unexpected error");
      }
    } finally {
      loadingNotice.hide();
    }
  }

  private static async createTestImage() {
    const canvas = document.createElement("canvas");
    canvas.width = 1;
    canvas.height = 1;
    const ctx = canvas.getContext("2d")!;
    ctx.fillStyle = "white";
    ctx.fillRect(0, 0, 1, 1);

    const blob = await new Promise<Blob>((resolve) =>
      canvas.toBlob((b) => resolve(b!), "image/png"),
    );
    return new Uint8Array(await blob.arrayBuffer());
  }

  protected isMimeTypeSupported(_mimeType: string) {
    // The command will be run on all file types (it can skip attachments by
    // writing an empty output file).
    return true;
  }

  protected async extractPages(
    data: Uint8Array,
    mimeType: string,
    filename: string,
  ) {
    const command = this.getCustomCommand();

    if (
      mimeType === "application/pdf" &&
      this.settings.customCommandConvertPdfs
    ) {
      const images = await convertPdfToImages(data);
      const pages: string[] = [];

      for (const imageData of images) {
        const text = await this.processFile(imageData, command, "png");
        if (text) {
          pages.push(text);
        }
      }

      return pages.length > 0 ? pages : null;
    }

    const text = await this.processFile(
      data,
      command,
      this.path.extname(filename),
    );
    return text ? [text] : null;
  }

  private getCustomCommand() {
    const command = this.settings.customCommand.trim();
    if (!command) {
      throw new UserFacingError("No custom command configured");
    }
    return command;
  }

  private async processFile(
    data: Uint8Array,
    command: string,
    extension: string,
  ) {
    const { inputPath, outputPath } = this.getTmpPaths(extension);

    try {
      await this.fs.writeFile(inputPath, data);
      await this.runCommand(command, inputPath, outputPath);
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
        `input-${uuid}.${sanitizedExt}`,
      ),
      outputPath: this.path.join(this.os.tmpdir(), `output-${uuid}.md`),
    };
  }

  private async runCommand(
    command: string,
    inputPath: string,
    outputPath: string,
  ) {
    // Quote paths to handle spaces in tmp path (e.g. on Windows)
    const resolvedCommand = command
      .replace(/\{input}/g, `"${inputPath}"`)
      .replace(/\{output}/g, `"${outputPath}"`);

    try {
      await this.execAsync(resolvedCommand, { timeout: COMMAND_TIMEOUT });
    } catch (error) {
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
        throw new UserFacingError("Custom command timed out");
      }
      throw new UserFacingError(
        `Custom command failed with exit code ${code} (see console for details)`,
      );
    }
  }

  private async readOutput(outputPath: string) {
    try {
      const data = await this.fs.readFile(outputPath);
      return data.toString("utf-8");
    } catch {
      throw new UserFacingError("Custom command did not create output file");
    }
  }
}
