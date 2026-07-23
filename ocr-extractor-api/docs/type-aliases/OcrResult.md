[**ocr-extractor-api**](../README.md)

***

[ocr-extractor-api](../README.md) / OcrResult

# Type Alias: OcrResult

> **OcrResult** = \{ `status`: `"extracted"`; `text`: `string`; \} \| \{ `status`: `"no-text"`; \} \| \{ `status`: `"unsupported"`; \}

Defined in: [index.ts:27](https://github.com/jritzi/ocr-extractor/blob/b2f5df4629fce8ce28f4113db3675c9be5546122/ocr-extractor-api/src/index.ts#L27)

The result of an [OcrExtractorApi.extract](../interfaces/OcrExtractorApi.md#extract) call:

- `"extracted"`: text was extracted from the file
- `"no-text"`: the file was processed but contained no text
- `"unsupported"`: the OCR engine can't process this file type

## Since

1.1.0
