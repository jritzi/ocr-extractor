[**ocr-extractor-api**](../README.md)

***

[ocr-extractor-api](../README.md) / OcrError

# Interface: OcrError

Defined in: [errors.ts:21](https://github.com/jritzi/ocr-extractor/blob/0aceaafdf1bd36c635f9e7a7da6f0e615305cfb3/ocr-extractor-api/src/errors.ts#L21)

The error thrown by [OcrExtractorApi.extractText](OcrExtractorApi.md#extracttext) when extraction
fails. Identify it with [isOcrError](../functions/isOcrError.md) (not `instanceof`, which won't
work across the plugin and npm package boundary). The original error,
if any, is included as `cause`.

## Since

1.0.0

## Extends

- `Error`

## Properties

### code

> `readonly` **code**: [`OcrErrorCode`](../type-aliases/OcrErrorCode.md)

Defined in: [errors.ts:22](https://github.com/jritzi/ocr-extractor/blob/0aceaafdf1bd36c635f9e7a7da6f0e615305cfb3/ocr-extractor-api/src/errors.ts#L22)
