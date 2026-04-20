# Contribution Guidelines

Thanks for your interest in contributing to OCR Extractor!

## Feature requests

To request a new feature or share an idea, [start a discussion](https://github.com/jritzi/ocr-extractor/discussions/new?category=ideas).

## Bug reports

To report a bug or problem you've found, [open a new issue](https://github.com/jritzi/ocr-extractor/issues/new).

## Code contributions

Before writing any code, please [start a discussion](https://github.com/jritzi/ocr-extractor/discussions/new?category=ideas) describing what you'd like to contribute. It may be something that is already being worked on or has already been discussed. New features will be considered, but they must align with this plugin's guiding principles below.

## Guiding principles

This plugin strives to be:

1. **Simple**: It should focus on doing one thing (extracting text from attachments) and doing it well. It should be easy to understand, use, and maintain. It should focus on the most common workflows instead of supporting every possible one.
2. **Robust**: It should work well, with as few bugs as possible regardless of platform, environment, language, attachment type, or vault and note structure. Logic should be well-tested and defensively handle edge cases.
3. **Obsidian-aligned**: It should match the goals of the [Obsidian Manifesto](https://obsidian.md/about). In particular, it should be future-proof, storing Markdown in notes themselves and not relying on custom functionality in Obsidian or the plugin.

## Development setup

Clone the repo in your vault's plugin directory and run:

```bash
pnpm install
pnpm dev
```

Run checks after making changes:

```bash
pnpm format:check
pnpm lint
pnpm test
pnpm test:e2e
```
