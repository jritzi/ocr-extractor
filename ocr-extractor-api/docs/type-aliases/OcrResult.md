[**ocr-extractor-api**](../README.md)

***

[ocr-extractor-api](../README.md) / OcrResult

# Type Alias: OcrResult

> **OcrResult** = \{ `status`: `"extracted"`; `text`: `string`; \} \| \{ `status`: `"no-text"`; \} \| \{ `status`: `"unsupported"`; \}

Defined in: [index.ts:27](https://github.com/jritzi/ocr-extractor/blob/dc6c471b1656c838ce9c6edd25b8b40227494607/ocr-extractor-api/src/index.ts#L27)

The result of an [OcrExtractorApi.extract](../interfaces/OcrExtractorApi.md#extract) call:

- `"extracted"`: text was extracted from the file
- `"no-text"`: the file was processed but contained no text
- `"unsupported"`: the file can't be processed

## Since

1.1.0
