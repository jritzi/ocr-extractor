[**ocr-extractor-api**](../README.md)

***

[ocr-extractor-api](../README.md) / getOcrExtractorApi

# Function: getOcrExtractorApi()

> **getOcrExtractorApi**(`app`): [`OcrExtractorApi`](../interfaces/OcrExtractorApi.md) \| `undefined`

Defined in: [index.ts:79](https://github.com/jritzi/ocr-extractor/blob/8b953016c3a95c5e2dd6ae5af3b53f03ddb38257/ocr-extractor-api/src/index.ts#L79)

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
