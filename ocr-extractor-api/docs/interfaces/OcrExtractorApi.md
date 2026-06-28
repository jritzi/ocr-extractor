[**ocr-extractor-api**](../README.md)

***

[ocr-extractor-api](../README.md) / OcrExtractorApi

# Interface: OcrExtractorApi

Defined in: [index.ts:45](https://github.com/jritzi/ocr-extractor/blob/8604f22e809f7fce4769737b2242142974d85d95/ocr-extractor-api/src/index.ts#L45)

The OCR Extractor plugin's public API, obtained via [getOcrExtractorApi](../functions/getOcrExtractorApi.md)

## Since

1.0.0

## Properties

### version

> `readonly` **version**: `string`

Defined in: [index.ts:51](https://github.com/jritzi/ocr-extractor/blob/8604f22e809f7fce4769737b2242142974d85d95/ocr-extractor-api/src/index.ts#L51)

The API version (i.e. [OCR\_EXTRACTOR\_API\_VERSION](../variables/OCR_EXTRACTOR_API_VERSION.md))

#### Since

1.0.0

## Methods

### extractText()

> **extractText**(`file`, `options?`): `Promise`\<[`OcrExtractionResult`](OcrExtractionResult.md)\>

Defined in: [index.ts:69](https://github.com/jritzi/ocr-extractor/blob/8604f22e809f7fce4769737b2242142974d85d95/ocr-extractor-api/src/index.ts#L69)

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

#### Example

```ts
const { text } = await api.extractText(file);
```
