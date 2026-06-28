# Changelog

All notable changes to `ocr-extractor-api` are documented here. This package is
versioned independently of the OCR Extractor plugin and follows
[semantic versioning](https://semver.org/).

## 1.0.0

### Added

- `getOcrExtractorApi()` — get the API, or `undefined` if the plugin isn't installed or enabled
- `extractText()` — run the user's configured OCR engine on an attachment and return the extracted text
- `isOcrError()` — determine if an error was thrown by the API
