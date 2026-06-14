import type { App } from "obsidian";
import type { HttpMock } from "./setup/http-interceptor";

declare global {
  const app: App;
  var __httpMock: HttpMock;
}
