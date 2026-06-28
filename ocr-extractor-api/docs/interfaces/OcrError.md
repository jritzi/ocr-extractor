[**ocr-extractor-api**](../README.md)

***

[ocr-extractor-api](../README.md) / OcrError

# Interface: OcrError

Defined in: [errors.ts:20](https://github.com/jritzi/ocr-extractor/blob/7366e0ea142cf675046c156aed256657f5f1fecf/ocr-extractor-api/src/errors.ts#L20)

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

Defined in: [errors.ts:21](https://github.com/jritzi/ocr-extractor/blob/7366e0ea142cf675046c156aed256657f5f1fecf/ocr-extractor-api/src/errors.ts#L21)
