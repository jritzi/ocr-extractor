[**ocr-extractor-api**](../README.md)

***

[ocr-extractor-api](../README.md) / OcrExtractorApi

# Interface: OcrExtractorApi

Defined in: [index.ts:69](https://github.com/jritzi/ocr-extractor/blob/b2f5df4629fce8ce28f4113db3675c9be5546122/ocr-extractor-api/src/index.ts#L69)

The OCR Extractor plugin's public API, obtained via [getOcrExtractorApi](../functions/getOcrExtractorApi.md)

## Since

1.0.0

## Properties

### version

> `readonly` **version**: `string`

Defined in: [index.ts:75](https://github.com/jritzi/ocr-extractor/blob/b2f5df4629fce8ce28f4113db3675c9be5546122/ocr-extractor-api/src/index.ts#L75)

The API version (i.e. [OCR\_EXTRACTOR\_API\_VERSION](../variables/OCR_EXTRACTOR_API_VERSION.md))

#### Since

1.0.0

## Methods

### extract()?

> `optional` **extract**(`file`, `options?`): `Promise`\<[`OcrResult`](../type-aliases/OcrResult.md)\>

Defined in: [index.ts:99](https://github.com/jritzi/ocr-extractor/blob/b2f5df4629fce8ce28f4113db3675c9be5546122/ocr-extractor-api/src/index.ts#L99)

Run the user's configured OCR engine on an attachment. Does not modify
any note.

Returns an [OcrResult](../type-aliases/OcrResult.md) (extraction failures throw an
[OcrError](OcrError.md) instead).

#### Parameters

##### file

`TFile`

The attachment's `TFile`

##### options?

Optional settings

###### signal?

`AbortSignal`

An optional `AbortSignal` to cancel the extraction

#### Returns

`Promise`\<[`OcrResult`](../type-aliases/OcrResult.md)\>

An [OcrResult](../type-aliases/OcrResult.md) describing the result

#### Throws

An [OcrError](OcrError.md) with an error `code` ([OcrErrorCode](../type-aliases/OcrErrorCode.md)),
        or an `AbortError` if canceled via `options.signal`

#### Since

1.1.0

#### Example

```ts
const result = await api.extract(file);
if (result.status === "extracted") {
  console.log(result.text);
}
```

***

### ~~extractText()~~

> **extractText**(`file`, `options?`): `Promise`\<[`OcrExtractionResult`](OcrExtractionResult.md)\>

Defined in: [index.ts:118](https://github.com/jritzi/ocr-extractor/blob/b2f5df4629fce8ce28f4113db3675c9be5546122/ocr-extractor-api/src/index.ts#L118)

Run the user's configured OCR engine on an attachment and return the
extracted text. Does not modify any note.

#### Parameters

##### file

`TFile`

The attachment's `TFile`

##### options?

Optional settings

###### signal?

`AbortSignal`

An optional `AbortSignal` to cancel the extraction

#### Returns

`Promise`\<[`OcrExtractionResult`](OcrExtractionResult.md)\>

An [OcrExtractionResult](OcrExtractionResult.md) with the extracted `text` (`""` if none found)

#### Throws

An [OcrError](OcrError.md) with an error `code` ([OcrErrorCode](../type-aliases/OcrErrorCode.md)), or
        an `AbortError` if canceled via `options.signal`

#### Since

1.0.0

#### Deprecated

Use [OcrExtractorApi.extract](#extract) instead

#### Example

```ts
const { text } = await api.extractText(file);
```
