[**ocr-extractor-api**](../README.md)

***

[ocr-extractor-api](../README.md) / OcrErrorCode

# Type Alias: OcrErrorCode

> **OcrErrorCode** = `"unsupported-file"` \| `"extraction-failed"`

Defined in: [errors.ts:10](https://github.com/jritzi/ocr-extractor/blob/7366e0ea142cf675046c156aed256657f5f1fecf/ocr-extractor-api/src/errors.ts#L10)

Identifies which kind of [OcrError](../interfaces/OcrError.md) occurred.

- `"unsupported-file"`: the OCR engine can't process this file type
- `"extraction-failed"`: any other failure during extraction (network,
  auth, etc.)

## Since

1.0.0
