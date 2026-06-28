[**ocr-extractor-api**](../README.md)

***

[ocr-extractor-api](../README.md) / OcrErrorCode

# Type Alias: OcrErrorCode

> **OcrErrorCode** = `"unsupported-file"` \| `"extraction-failed"`

Defined in: [errors.ts:11](https://github.com/jritzi/ocr-extractor/blob/314bb267e67f47ebd6c47cedc5f377bd384d4b4c/ocr-extractor-api/src/errors.ts#L11)

Identifies which kind of [OcrError](../interfaces/OcrError.md) occurred.

- `"unsupported-file"`: the OCR engine can't process this file (e.g. an
  unsupported file type)
- `"extraction-failed"`: any other failure during extraction (network,
  auth, etc.)

## Since

1.0.0
