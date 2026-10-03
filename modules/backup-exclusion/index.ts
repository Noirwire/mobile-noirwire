import { requireOptionalNativeModule } from "expo";

type BackupExclusionModule = { excludeFromBackup(uri: string): boolean };

const native = requireOptionalNativeModule<BackupExclusionModule>("NoirwireBackupExclusion");

/**
 * Keeps `uri` out of iCloud and computer backups (iOS only). Throws when the
 * flag cannot be set or read back, so the vault refuses to store a wallet in
 * a place that would be backed up.
 */
export function excludeFromBackup(uri: string): void {
  if (!native) throw new Error("The backup exclusion module is not in this build.");
  if (!native.excludeFromBackup(uri)) throw new Error("The do-not-backup flag did not hold.");
}
