<h1 align="center">OCR Extractor</h1>

<p align="center">
  <a href="https://github.com/jritzi/ocr-extractor/releases/latest"><img src="https://img.shields.io/github/v/release/jritzi/ocr-extractor" alt="Latest release" /></a>
  <a href="./LICENSE"><img src="https://img.shields.io/github/license/jritzi/ocr-extractor" alt="License" /></a>
  <a href="https://github.com/jritzi/ocr-extractor/stargazers"><img src="https://img.shields.io/github/stars/jritzi/ocr-extractor?style=flat" alt="GitHub stars" /></a>
  <a href="https://github.com/jritzi/ocr-extractor/releases"><img src="https://img.shields.io/github/downloads/jritzi/ocr-extractor/main.js?displayAssetName=false" alt="Total downloads" /></a>
</p>

<p align="center">
  <img src="https://raw.githubusercontent.com/jritzi/ocr-extractor/main/media/readme/demo.gif" alt="Demo" width="600" />
</p>

[OCR Extractor](https://community.obsidian.md/plugins/ocr-extractor) is an [Obsidian](https://obsidian.md/) plugin that uses [OCR](https://en.wikipedia.org/wiki/Optical_character_recognition) to extract text from PDFs, documents, images, etc. embedded in your notes. Different [OCR engines](#ocr-engines) (free or paid, local or cloud-based) are available, depending on your needs.

Following Obsidian's philosophy of storing data in an open, future-proof file format, the extracted text is added below the embedded attachment as an expandable [callout](https://obsidian.md/help/callouts). This means that the text will be searchable via Obsidian's [built-in search](https://obsidian.md/help/plugins/search), other search plugins, and even your operating system's native file search.

## Installation

Install from [Obsidian Community](https://community.obsidian.md/plugins/ocr-extractor), or go to **Settings → Community plugins → Browse** and search for "OCR Extractor".

## Usage

Click on the [ribbon](https://obsidian.md/help/ribbon) icon (or use the [command palette](https://obsidian.md/help/plugins/command-palette)) and select one of the options:

1. Extract text in active note
2. Extract text in folder
3. Extract text in all notes

You can also right-click on notes, folders, or a selection of notes to extract only those files. On mobile, text can only be extracted from the active note.

When extracting from multiple notes, you can track progress in the [status bar](https://obsidian.md/help/status-bar) and click it to cancel (or use the **Cancel extraction** command).

Additional options are available in the plugin settings, including **Auto-extract attachments** (automatically extract text when a new attachment is added to a note) and **Prefer embedded PDF text** (use text already embedded in a PDF instead of extracting with OCR).

## OCR engines

Depending on your needs, you can choose which OCR engine to use. Select the **OCR engine** in the plugin settings and follow the setup steps below.

### Tesseract

[Tesseract](https://tesseract.projectnaptha.com/) (the default option) is a popular open source OCR engine. It has some limitations (only supports English text, can only process PDFs and images, is often less accurate), but it's completely free and local (ensuring your data is never sent to a third-party provider). This option requires no additional setup.

### Mistral OCR

[Mistral OCR](https://mistral.ai/solutions/document-ai/) is a powerful AI model for quickly extracting text from complex documents (including handwriting) and converting it to Markdown. It supports many different languages and [file types](https://docs.mistral.ai/studio-api/document-processing/basic_ocr#faq). This option requires a paid Mistral AI account (at the time of writing, it costs $4 per 1000 pages processed). Attachments are sent to Mistral's OCR service for text extraction (see [their privacy policy](https://legal.mistral.ai/terms/privacy-policy)).

First, you need to create a Mistral AI account. Follow their [Quickstart guide](https://docs.mistral.ai/getting-started/quickstarts/studio/activate-and-generate-api-key):

1. Create an account
2. Add payment information
3. Recommended: Set a monthly spending limit, to avoid any unexpected charges
4. Create an API key

Then, enter your **API key** in the plugin settings.

### OpenAI-compatible API

This option allows you to use any AI model (LLM), either locally (e.g. with [Ollama](https://ollama.com) or [LM Studio](https://lmstudio.ai)), or via a cloud provider like [OpenRouter](https://openrouter.ai). This requires more setup, has higher system requirements, and is often slower, but, when used with a local model, it can allow you to get great results without ever sending attachments to a third-party service.

**Example (Ollama with glm-ocr):**

1. [Download and install Ollama](https://ollama.com/download)
2. Download a vision-capable model compatible with your hardware (e.g. glm-ocr):
   ```shell
   ollama pull glm-ocr
   ```
3. In plugin settings, set **OCR engine** to **OpenAI-compatible API**
4. Set **Base URL** to the Ollama server's URL: `http://localhost:11434/v1`
5. Set **Model** to `glm-ocr`
6. Click **Test** to confirm the connection works

### Custom command

For advanced use cases, you can provide a custom command that will be used to process attachments. This can be used, for example, to use a third-party API that isn't supported by the plugin, Tesseract with a custom configuration, native OS OCR options, or even a script that does custom preprocessing or postprocessing. Note that custom commands are not supported on mobile, so the plugin will use Tesseract instead.

Enter your command in **Command** in the plugin settings, where `{input}` is the path to the input attachment file and `{output}` is the path to the produced Markdown or text file containing the extracted text. To skip an unsupported attachment, don't create the output file.

Click **Test** to run the command on a sample image and confirm it correctly extracts the text. If the custom command only supports images, enable **Convert PDFs to images**.

**Example (native OCR on macOS with macOCR):**

[macOCR](https://github.com/schappim/macOCR) (a third-party tool, review before installing) allows you to easily use Apple's built-in Vision OCR engine (which runs locally and is more accurate than Tesseract).

1. [Install macOCR](https://github.com/schappim/macOCR)
2. Set **Command** in plugin settings:
   ```shell
   ocr -i {input} > {output}
   ```
3. Enable **Convert PDFs to images**
4. Click **Test** to confirm the command works

## Examples

The following examples show text extracted from four sample documents processed with each OCR engine: a **study guide** (a straightforward typed document with headers and bullet points), an **academic paper** (a complex multi-column document with equations and charts), **handwritten meeting notes** (a photo of handwritten text), and a **Chinese book** (a chapter excerpt in Simplified Chinese). Each link opens a note (using [Obsidian Publish](https://obsidian.md/publish)) showing the original attachment alongside the extracted text, so you can see exactly what the plugin produces:

- **Tesseract**: [Study guide](https://ocrextractor.com/examples/tesseract-study-guide) · [Academic paper](https://ocrextractor.com/examples/tesseract-academic-paper) · [Meeting notes](https://ocrextractor.com/examples/tesseract-meeting-notes) · [Chinese book](https://ocrextractor.com/examples/tesseract-chinese-book)
- **Mistral OCR**: [Study guide](https://ocrextractor.com/examples/mistral-study-guide) · [Academic paper](https://ocrextractor.com/examples/mistral-academic-paper) · [Meeting notes](https://ocrextractor.com/examples/mistral-meeting-notes) · [Chinese book](https://ocrextractor.com/examples/mistral-chinese-book)
- **OpenAI-compatible API** (GLM-OCR): [Study guide](https://ocrextractor.com/examples/glm-ocr-study-guide) · [Academic paper](https://ocrextractor.com/examples/glm-ocr-academic-paper) · [Meeting notes](https://ocrextractor.com/examples/glm-ocr-meeting-notes) · [Chinese book](https://ocrextractor.com/examples/glm-ocr-chinese-book)
- **Custom command** (macOCR): [Study guide](https://ocrextractor.com/examples/macocr-study-guide) · [Academic paper](https://ocrextractor.com/examples/macocr-academic-paper) · [Meeting notes](https://ocrextractor.com/examples/macocr-meeting-notes) · [Chinese book](https://ocrextractor.com/examples/macocr-chinese-book)

## Contributing

For details on how to report a bug, share a feature request, or contribute code, see the [Contribution Guidelines](./CONTRIBUTING.md). To report a security issue, see the [Security Policy](./SECURITY.md).

## Translations

OCR Extractor is available in several languages. To request a new language (or to suggest an improvement for an existing translation), [start a discussion](https://github.com/jritzi/ocr-extractor/discussions/new?category=ideas).

## License

OCR Extractor is licensed under the [MIT License](./LICENSE).
