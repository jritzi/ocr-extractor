[**ocr-extractor-api**](../README.md)

***

[ocr-extractor-api](../README.md) / ocrError

# Function: ocrError()

> **ocrError**(`code`, `message?`, `options?`): [`OcrError`](../interfaces/OcrError.md)

Defined in: [errors.ts:59](https://github.com/jritzi/ocr-extractor/blob/7366e0ea142cf675046c156aed256657f5f1fecf/ocr-extractor-api/src/errors.ts#L59)

Used by the plugin to construct an [OcrError](../interfaces/OcrError.md) with the given code and
message.

## Parameters

### code

[`OcrErrorCode`](../type-aliases/OcrErrorCode.md)

Which kind of error this is

### message?

`string`

A human-readable message

### options?

Optional settings

#### cause?

`unknown`

The underlying error, if any

## Returns

[`OcrError`](../interfaces/OcrError.md)

The new [OcrError](../interfaces/OcrError.md)

## Since

1.0.0
