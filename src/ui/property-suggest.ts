import { AbstractInputSuggest, App, prepareSimpleSearch } from "obsidian";
import { normalizePropertyName } from "../utils/property";

export class PropertySuggest extends AbstractInputSuggest<string> {
  private readonly properties: string[];

  constructor(
    app: App,
    inputEl: HTMLInputElement,
    existing: readonly string[],
  ) {
    super(app, inputEl);
    this.properties = collectProperties(app, existing);
  }

  renderSuggestion(name: string, el: HTMLElement) {
    el.setText(name);
  }

  selectSuggestion(name: string, event: MouseEvent | KeyboardEvent) {
    this.setValue(name);
    this.close();
    super.selectSuggestion(name, event);
  }

  protected getSuggestions(query: string) {
    const search = prepareSimpleSearch(query);
    return this.properties.filter((name) => search(name) !== null);
  }
}

function collectProperties(app: App, existing: readonly string[]) {
  const seen = new Set(existing.map(normalizePropertyName));
  const properties: string[] = [];

  for (const note of app.vault.getMarkdownFiles()) {
    const frontmatter = app.metadataCache.getFileCache(note)?.frontmatter;
    if (!frontmatter) continue;

    for (const name of Object.keys(frontmatter)) {
      const normalized = normalizePropertyName(name);
      if (seen.has(normalized)) continue;
      seen.add(normalized);

      // Suggest names as they're capitalized in a note (not normalized)
      properties.push(name);
    }
  }

  return properties.sort((a, b) => a.localeCompare(b));
}
