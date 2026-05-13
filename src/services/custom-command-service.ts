import type { SecretStorage, SettingGroup } from "obsidian";
import { Platform } from "obsidian";
import { OcrService, UserFacingError } from "./ocr-service";
import { assert } from "../utils/assert";
import type OcrExtractorPlugin from "../../main";
import { PluginSettings } from "../settings";
import {
  showErrorNotice,
  showLoadingNotice,
  showNotice,
  showSuccessNotice,
} from "../utils/notice";
import { convertPdfToImages, isPdf } from "../utils/pdf";
import { t } from "../i18n";

const COMMAND_TIMEOUT = 120_000; // 2 minutes
const TEST_TEXT = "OCR test";

interface NodeModules {
  fs: typeof import("fs/promises");
  os: typeof import("os");
  path: typeof import("path");
  crypto: typeof import("crypto");
  util: typeof import("util");
  childProcess: typeof import("child_process");
}

export class CustomCommandService extends OcrService {
  private nodeModules?: NodeModules;

  constructor(settings: PluginSettings, secretStorage: SecretStorage) {
    super(settings, secretStorage);
    assert(Platform.isDesktop, "Service is only available on desktop");
  }

  static getLabel() {
    return t("services.customCommand");
  }

  static addSettings(group: SettingGroup, plugin: OcrExtractorPlugin) {
    group.addSetting((setting) => {
      setting
        .setName(t("settings.command"))
        .setDesc(t("settings.commandDesc"))
        .addTextArea((text) =>
          text
            .setPlaceholder(t("settings.commandPlaceholder"))
            .setValue(plugin.settings.customCommand)
            .onChange(
              (value) => void plugin.saveSetting("customCommand", value),
            ),
        )
        .addButton((button) =>
          button
            .setButtonText(t("settings.test"))
            .setTooltip(t("settings.testTooltip"))
            .setDisabled(!Platform.isDesktop)
            .onClick(() => void this.testCommand(plugin)),
        );
    });

    group.addSetting((setting) => {
      setting
        .setName(t("settings.convertPdfs"))
        .setDesc(t("settings.convertPdfsDesc"))
        .addToggle((toggle) =>
          toggle
            .setValue(plugin.settings.customCommandConvertPdfs)
            .onChange(
              (value) =>
                void plugin.saveSetting("customCommandConvertPdfs", value),
            ),
        );
    });
  }

  private static async testCommand({ settings, app }: OcrExtractorPlugin) {
    const testPng = await this.createTestImage();
    const service = new CustomCommandService(settings, app.secretStorage);
    const loadingNotice = showLoadingNotice(t("notices.testingCommand"));

    try {
      const result = await service.processOcr(testPng, "test.png");
      if (!result) {
        showErrorNotice(t("notices.testNoOutput"));
      } else if (result.trim() === TEST_TEXT) {
        showSuccessNotice(t("notices.testSucceeded"));
      } else {
        showNotice(
          t("notices.testOutputMismatch", {
            expected: TEST_TEXT,
            actual: result.trim(),
          }),
        );
      }
    } catch (error) {
      if (error instanceof UserFacingError) {
        showErrorNotice(t("notices.testFailed", { message: error.message }));
      } else {
        console.error("Custom command test failed:", error);
        showErrorNotice(t("notices.testFailedUnexpected"));
      }
    } finally {
      loadingNotice.hide();
    }
  }

  private static async createTestImage() {
    const canvas = createEl("canvas");
    canvas.width = 200;
    canvas.height = 50;
    const ctx = canvas.getContext("2d")!;
    ctx.fillStyle = "white";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = "black";
    ctx.font = "24px sans-serif";
    ctx.fillText(TEST_TEXT, 10, 34);

    const blob = await new Promise<Blob>((resolve) =>
      canvas.toBlob((b) => resolve(b!), "image/png"),
    );
    return new Uint8Array(await blob.arrayBuffer());
  }

  protected isMimeTypeSupported(_mimeType: string) {
    // The command will be run on all file types (it can skip attachments by
    // not creating the output file).
    return true;
  }

  protected async extractPages(
    data: Uint8Array,
    mimeType: string,
    filename: string,
  ) {
    const command = this.getCustomCommand();

    if (isPdf(mimeType) && this.settings.customCommandConvertPdfs) {
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

    const { path } = await this.getNodeModules();
    const text = await this.processFile(data, command, path.extname(filename));
    return text ? [text] : null;
  }

  private getCustomCommand() {
    const command = this.settings.customCommand.trim();
    if (!command) {
      throw new UserFacingError(t("errors.noCustomCommand"));
    }
    return command;
  }

  private async processFile(
    data: Uint8Array,
    command: string,
    extension: string,
  ) {
    const { fs } = await this.getNodeModules();
    const { inputPath, outputPath } = await this.getTmpPaths(extension);

    try {
      await fs.writeFile(inputPath, data);
      await this.runCommand(command, inputPath, outputPath);
      return await this.readOutput(outputPath);
    } finally {
      await Promise.allSettled([fs.unlink(inputPath), fs.unlink(outputPath)]);
    }
  }

  /**
   * Get input and output file tmp paths, using UUIDs for filenames and
   * sanitizing the input extension, to prevent command injection from
   * unsafe characters in original filenames.
   */
  private async getTmpPaths(extension: string) {
    const { os, path, crypto } = await this.getNodeModules();
    const uuid = crypto.randomUUID();
    const sanitizedExt = extension.replace(/[^a-zA-Z0-9]/g, "");

    return {
      inputPath: path.join(os.tmpdir(), `input-${uuid}.${sanitizedExt}`),
      outputPath: path.join(os.tmpdir(), `output-${uuid}.md`),
    };
  }

  private async runCommand(
    command: string,
    inputPath: string,
    outputPath: string,
  ) {
    const { util, childProcess } = await this.getNodeModules();
    const execAsync = util.promisify(childProcess.exec);

    // Quote paths to handle spaces in tmp path (e.g. on Windows)
    const resolvedCommand = command
      .replace(/\{input}/g, `"${inputPath}"`)
      .replace(/\{output}/g, `"${outputPath}"`);

    try {
      await execAsync(resolvedCommand, { timeout: COMMAND_TIMEOUT });
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
        throw new UserFacingError(t("errors.commandTimeout"));
      }
      throw new UserFacingError(
        t("errors.commandFailed", { code: String(code) }),
      );
    }
  }

  private async readOutput(outputPath: string) {
    const { fs } = await this.getNodeModules();
    try {
      return await fs.readFile(outputPath, "utf-8");
    } catch {
      // Skip attachment if no output file produced
      return null;
    }
  }

  private async getNodeModules() {
    if (!this.nodeModules) {
      if (Platform.isDesktop) {
        const [fs, os, path, crypto, util, childProcess] = await Promise.all([
          import("fs/promises"),
          import("os"),
          import("path"),
          import("crypto"),
          import("util"),
          import("child_process"),
        ]);
        this.nodeModules = { fs, os, path, crypto, util, childProcess };
      } else {
        throw new Error("Service is only available on desktop");
      }
    }

    return this.nodeModules;
  }
}
