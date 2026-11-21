import type { SecretStorage } from "obsidian";

export function getSecret(
  secretStorage: SecretStorage,
  secretId: string | null,
) {
  return secretId ? secretStorage.getSecret(secretId) : null;
}
