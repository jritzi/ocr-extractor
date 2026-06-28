[**ocr-extractor-api**](../README.md)

***

[ocr-extractor-api](../README.md) / isOcrError

# Function: isOcrError()

> **isOcrError**(`error`): `error is OcrError`

Defined in: [errors.ts:42](https://github.com/jritzi/ocr-extractor/blob/8604f22e809f7fce4769737b2242142974d85d95/ocr-extractor-api/src/errors.ts#L42)

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
