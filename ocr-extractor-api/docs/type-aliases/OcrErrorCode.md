[**ocr-extractor-api**](../README.md)

***

[ocr-extractor-api](../README.md) / OcrErrorCode

# Type Alias: OcrErrorCode

> **OcrErrorCode** = `"unsupported-file"` \| `"extraction-failed"`

Defined in: [errors.ts:11](https://github.com/jritzi/ocr-extractor/blob/cd6661f6910ca9290c8cdd76c0d76a087e38f3e6/ocr-extractor-api/src/errors.ts#L11)

Identifies which kind of [OcrError](../interfaces/OcrError.md) occurred.

- `"unsupported-file"`: the OCR engine can't process this file (e.g. an
  unsupported file type)
- `"extraction-failed"`: any other failure during extraction (network,
  auth, etc.)

## Since

1.0.0
