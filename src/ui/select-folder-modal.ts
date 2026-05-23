import { App, FuzzySuggestModal, TFolder } from "obsidian";
import { t } from "../i18n";

export class SelectFolderModal extends FuzzySuggestModal<TFolder> {
  constructor(
    app: App,
    private onSubmit: (folder: TFolder) => void,
  ) {
    super(app);
    this.setPlaceholder(t("modals.selectFolder.placeholder"));
  }

  getItems() {
    return this.app.vault.getAllFolders();
  }

  getItemText(folder: TFolder) {
    return folder.path;
  }

  onChooseItem(folder: TFolder, _event: MouseEvent | KeyboardEvent) {
    this.onSubmit(folder);
  }
}
