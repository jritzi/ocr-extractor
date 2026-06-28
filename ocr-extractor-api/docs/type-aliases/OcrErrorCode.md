[**ocr-extractor-api**](../README.md)

***

[ocr-extractor-api](../README.md) / OcrErrorCode

# Type Alias: OcrErrorCode

> **OcrErrorCode** = `"unsupported-file"` \| `"extraction-failed"`

Defined in: [errors.ts:11](https://github.com/jritzi/ocr-extractor/blob/8604f22e809f7fce4769737b2242142974d85d95/ocr-extractor-api/src/errors.ts#L11)

Identifies which kind of [OcrError](../interfaces/OcrError.md) occurred.

- `"unsupported-file"`: the OCR engine can't process this file (e.g. an
  unsupported file type)
- `"extraction-failed"`: any other failure during extraction (network,
  auth, etc.)

## Since

1.0.0
