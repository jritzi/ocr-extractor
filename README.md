# OCR Extractor - Obsidian Plugin

## About

> [!NOTE]
> This plugin requires a paid Mistral AI account (at the time of writing, it costs $2 per 1000 pages processed).

OCR Extractor is a simple [Obsidian](https://obsidian.md/) plugin that uses [OCR](https://en.wikipedia.org/wiki/Optical_character_recognition) to extract text from documents, images, etc. embedded in your notes. This is currently done using [Mistral OCR](https://mistral.ai/news/mistral-ocr-3), a powerful AI model for extracting text from complex documents and converting it to Markdown.

Following Obsidian's philosophy of storing data in an open, future-proof file format, the extracted text is added below the embedded attachment as an expandable [callout](https://help.obsidian.md/callouts). This means that the text will be searchable via Obsidian's [built-in search](https://help.obsidian.md/plugins/search), other search plugins, and even your operating system's native file search.

<img src="https://raw.githubusercontent.com/jritzi/ocr-extractor/master/images/demo.gif" alt="Demo" width="600" />

## Mistral AI account

First, you must create a Mistral AI account. Follow the steps in their [Quickstart guide](https://docs.mistral.ai/getting-started/quickstart/):

1. Create an account
2. Add payment information
3. Recommended: Set a monthly spending limit, to avoid any unexpected charges
4. Create an API key

Then, enter your API key in the plugin settings.

## Usage

Click on the [ribbon](https://help.obsidian.md/ribbon) icon (or use the [command palette](https://help.obsidian.md/plugins/command-palette)) and select one of the two options:

1. Extract text from attachments in current note
2. Extract text from attachments in all notes

<img src="https://raw.githubusercontent.com/jritzi/ocr-extractor/master/images/ribbon.png" alt="Ribbon menu options" width="600" />

You can see the progress in the [status bar](https://help.obsidian.md/status-bar), or click it and select "Cancel" to cancel the operation.

<img src="https://raw.githubusercontent.com/jritzi/ocr-extractor/master/images/status.png" alt="Status bar info" width="600" />

## License

OCR Extractor is licensed under the [MIT License](./LICENSE).
