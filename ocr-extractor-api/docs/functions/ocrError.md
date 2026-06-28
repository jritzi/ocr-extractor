[**ocr-extractor-api**](../README.md)

***

[ocr-extractor-api](../README.md) / ocrError

# Function: ocrError()

> **ocrError**(`code`, `message?`, `options?`): [`OcrError`](../interfaces/OcrError.md)

Defined in: [errors.ts:60](https://github.com/jritzi/ocr-extractor/blob/0aceaafdf1bd36c635f9e7a7da6f0e615305cfb3/ocr-extractor-api/src/errors.ts#L60)

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
