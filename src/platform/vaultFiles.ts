import { Directory, File, Paths } from "expo-file-system";
import { Platform } from "react-native";
import { excludeFromBackup } from "../../modules/backup-exclusion";
import type { VaultFiles } from "./vaultFiles.types";

const VAULT_DIRECTORY = "vault";

/**
 * The vault's files in the app's own document directory. On iOS the
 * directory carries the do-not-backup flag, so the encrypted record never
 * reaches iCloud or a computer backup; Android's backups are switched off for
 * the whole app in app.config.ts.
 */
export function deviceVaultFiles(): VaultFiles {
  const directory = new Directory(Paths.document, VAULT_DIRECTORY);
  const file = (name: string) => new File(directory, name);
  let prepared = false;

  return {
    prepare() {
      if (prepared) return;
      directory.create({ intermediates: true, idempotent: true });
      if (Platform.OS === "ios") excludeFromBackup(directory.uri);
      prepared = true;
    },
    exists: (name) => file(name).exists,
    read: (name) => {
      const target = file(name);
      return target.exists ? target.textSync() : null;
    },
    write: (name, content) => {
      const target = file(name);
      if (!target.exists) target.create();
      target.write(content);
    },
    rename: (from, to) => file(from).rename(to),
    remove: (name) => {
      const target = file(name);
      if (target.exists) target.delete();
    },
  };
}
