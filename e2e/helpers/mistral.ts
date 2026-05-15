export const MISTRAL_URL = "https://api.mistral.ai/v1/ocr";

export function mistralSuccessResponse(markdown: string) {
  return {
    model: "mistral-ocr-latest",
    document_annotation: null,
    pages: [
      {
        index: 0,
        markdown,
        images: [],
        tables: [],
        hyperlinks: [],
        header: null,
        footer: null,
        dimensions: { dpi: 72, height: 100, width: 100 },
      },
    ],
    usage_info: { pages_processed: 1, doc_size_bytes: 100 },
  };
}
