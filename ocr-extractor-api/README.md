# ocr-extractor-api

This package provides types and helpers for the public API of the
[OCR Extractor](https://community.obsidian.md/plugins/ocr-extractor) Obsidian
plugin. The API allows another plugin or script to run the user's configured OCR
engine on an attachment and get the extracted text.

## Installation

```bash
npm install --save-dev ocr-extractor-api
```

## Quick start

```ts
import { getOcrExtractorApi, isOcrError } from "ocr-extractor-api";

const api = getOcrExtractorApi(app);
if (!api) {
  // OCR Extractor isn't installed or enabled
  return;
}

try {
  const { text } = await api.extractText(file); // `file` is the attachment TFile
  // `text` is the extracted text (or `""` if none was found)
} catch (error) {
  // Use `isOcrError`, not `instanceof`
  if (isOcrError(error) && error.code === "unsupported-file") {
    // The configured engine can't process this file type
    return;
  }
  throw error; // an unexpected error
}
```

## Documentation

The full API documentation is available in the [API reference](./docs).

## Versioning

This package is versioned independently of the plugin, and its version is the API
version. See the [changelog](./CHANGELOG.md) for changes.

## License

`ocr-extractor-api` is licensed under the [MIT License](./LICENSE).
