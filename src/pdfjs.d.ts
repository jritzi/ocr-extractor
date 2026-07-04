declare module "pdfjs-dist/legacy/build/pdf.mjs" {
  export * from "pdfjs-dist";
}

declare module "pdfjs-dist/legacy/build/pdf.worker.min.mjs" {
  const workerCode: string;
  export default workerCode;
}
