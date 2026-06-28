[**ocr-extractor-api**](../README.md)

***

[ocr-extractor-api](../README.md) / isOcrError

# Function: isOcrError()

> **isOcrError**(`error`): `error is OcrError`

Defined in: [errors.ts:41](https://github.com/jritzi/ocr-extractor/blob/8b953016c3a95c5e2dd6ae5af3b53f03ddb38257/ocr-extractor-api/src/errors.ts#L41)

Checks whether a caught value is an [OcrError](../interfaces/OcrError.md).

## Parameters

### error

`unknown`

The caught error to check

## Returns

`error is OcrError`

`true` if `error` is an [OcrError](../interfaces/OcrError.md), `false` otherwise

## Since

1.0.0

## Example

```ts
try {
  await api.extractText(file);
} catch (error) {
  if (isOcrError(error) && error.code === "unsupported-file") return;
  throw error;
}
```
