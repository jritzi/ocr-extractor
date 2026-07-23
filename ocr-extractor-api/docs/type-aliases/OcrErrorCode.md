[**ocr-extractor-api**](../README.md)

***

[ocr-extractor-api](../README.md) / OcrErrorCode

# Type Alias: OcrErrorCode

> **OcrErrorCode** = `"unsupported-file"` \| `"extraction-failed"`

Defined in: [errors.ts:12](https://github.com/jritzi/ocr-extractor/blob/b2f5df4629fce8ce28f4113db3675c9be5546122/ocr-extractor-api/src/errors.ts#L12)

Identifies which kind of [OcrError](../interfaces/OcrError.md) occurred.

- `"unsupported-file"`: The OCR engine can't process this file (e.g. an
  unsupported file type). Only thrown by the deprecated
  [OcrExtractorApi.extractText](../interfaces/OcrExtractorApi.md#extracttext).
- `"extraction-failed"`: Extracting text from a supported file failed
  (network, auth, corrupt file, etc.).

## Since

1.0.0
