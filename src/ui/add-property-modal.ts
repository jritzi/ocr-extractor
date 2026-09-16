import {
  App,
  ConfirmationButton,
  ConfirmationModal,
  Setting,
  TextComponent,
} from "obsidian";
import { normalizePropertyName } from "../utils/property";
import { assert } from "../utils/assert";
import { PropertySuggest } from "./property-suggest";
import { t } from "../i18n";

const KEEP_OPEN = true;

export class AddPropertyModal extends ConfirmationModal {
  private readonly setting: Setting;

  // Assigned in synchronous callbacks
  private input!: TextComponent;
  private submitButton!: ConfirmationButton;

  constructor(
    app: App,
    private existing: readonly string[],
    private onSubmit: (name: string) => void,
  ) {
    super(app);
    this.setTitle(t("modals.addProperty.title"));

    this.setting = new Setting(this.contentEl)
      .setName(t("modals.addProperty.name"))
      .addText((text) => (this.input = text));

    this.addButton((button) => {
      this.submitButton = button;
      button
        .setButtonText(t("modals.addProperty.add"))
        .setCta()
        .setDisabled(true)
        .onClick(() => this.submit());
    });
    this.addCancelButton(t("common.cancel"));

    const onInputChange = (value: string) => {
      this.submitButton.setDisabled(value.trim().length === 0);
      this.setting.setErrorMessage(null);
    };
    this.input.onChange(onInputChange);
    new PropertySuggest(app, this.input.inputEl, existing).onSelect(
      onInputChange,
    );

    this.scope.register([], "Enter", () => {
      this.submitButton.buttonEl.click();
      return false;
    });
  }

  private submit() {
    const name = this.input.getValue().trim();
    assert(name.length > 0, "The Add button is disabled if the name is blank");

    if (
      this.existing.some(
        (other) => normalizePropertyName(other) === normalizePropertyName(name),
      )
    ) {
      this.setting.setErrorMessage(t("modals.addProperty.exists"));
      return KEEP_OPEN;
    }

    this.onSubmit(name);
  }
}
