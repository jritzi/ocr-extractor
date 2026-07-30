[**ocr-extractor-api**](../README.md)

***

[ocr-extractor-api](../README.md) / OcrErrorCode

# Type Alias: OcrErrorCode

> **OcrErrorCode** = `"unsupported-file"` \| `"extraction-failed"`

Defined in: [errors.ts:12](https://github.com/jritzi/ocr-extractor/blob/95b33e4dd20df817f503ff15b68d63310ed288e4/ocr-extractor-api/src/errors.ts#L12)

Identifies which kind of [OcrError](../interfaces/OcrError.md) occurred.

- `"unsupported-file"`: The OCR engine can't process this file (e.g. an
  unsupported file type). Only thrown by the deprecated
  [OcrExtractorApi.extractText](../interfaces/OcrExtractorApi.md#extracttext).
- `"extraction-failed"`: Extracting text from a supported file failed
  (network, auth, corrupt file, etc.).

## Since

1.0.0
