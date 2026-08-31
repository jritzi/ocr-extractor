# ocr-extractor-api

This package provides types and helpers for the public API of the
[OCR Extractor](https://community.obsidian.md/plugins/ocr-extractor) Obsidian
plugin. The API allows another plugin or script to run the user's configured OCR
engine on an attachment and get the extracted text.

## Installation

```bash
npm install ocr-extractor-api
```

## Quick start

```ts
import { getOcrExtractorApi, isOcrError } from "ocr-extractor-api";

const api = getOcrExtractorApi(app);
if (!api?.extract) {
  // OCR Extractor isn't installed/enabled or is an older version
  return;
}

try {
  const result = await api.extract(file); // `file` is the attachment TFile
  if (result.status === "extracted") {
    // `result.text` is the extracted text
  } else {
    // `result.status` specifies why no text was extracted
  }
} catch (error) {
  // Use `isOcrError`, not `instanceof`
  if (isOcrError(error)) {
    // `error.code` specifies the type of failure
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

The user's installed version may not match the ocr-extractor-api package version
you're using, so check `api.version` or that the method exists first.

## License

`ocr-extractor-api` is licensed under the [MIT License](./LICENSE).
