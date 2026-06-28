[**ocr-extractor-api**](../README.md)

***

[ocr-extractor-api](../README.md) / getOcrExtractorApi

# Function: getOcrExtractorApi()

> **getOcrExtractorApi**(`app`): [`OcrExtractorApi`](../interfaces/OcrExtractorApi.md) \| `undefined`

Defined in: [index.ts:79](https://github.com/jritzi/ocr-extractor/blob/cd6661f6910ca9290c8cdd76c0d76a087e38f3e6/ocr-extractor-api/src/index.ts#L79)

Get the OCR Extractor API from the Obsidian `app`.

## Parameters

### app

`App`

The Obsidian app instance

## Returns

[`OcrExtractorApi`](../interfaces/OcrExtractorApi.md) \| `undefined`

The API, or `undefined` if the plugin isn't installed or enabled

## Since

1.0.0

## Example

```ts
const api = getOcrExtractorApi(app);
if (!api) return;
```
