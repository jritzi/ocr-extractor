[**ocr-extractor-api**](../README.md)

***

[ocr-extractor-api](../README.md) / OcrResult

# Type Alias: OcrResult

> **OcrResult** = \{ `status`: `"extracted"`; `text`: `string`; \} \| \{ `status`: `"no-text"`; \} \| \{ `status`: `"unsupported"`; \}

Defined in: [index.ts:27](https://github.com/jritzi/ocr-extractor/blob/95b33e4dd20df817f503ff15b68d63310ed288e4/ocr-extractor-api/src/index.ts#L27)

The result of an [OcrExtractorApi.extract](../interfaces/OcrExtractorApi.md#extract) call:

- `"extracted"`: text was extracted from the file
- `"no-text"`: the file was processed but contained no text
- `"unsupported"`: the OCR engine can't process this file

## Since

1.1.0
