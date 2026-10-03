/**
 * The few file operations the vault needs, by name inside one private
 * directory. Synchronous because each file is a few kilobytes; every call may
 * throw, and the vault turns a throw into a reported failure.
 */
export interface VaultFiles {
  /** Creates the directory if needed and keeps it out of device backups. */
  prepare(): void;
  exists(name: string): boolean;
  read(name: string): string | null;
  /** Replaces the file's contents, creating it when absent. */
  write(name: string, content: string): void;
  /** Renames within the directory. `to` must not exist. */
  rename(from: string, to: string): void;
  /** Deletes the file when present. */
  remove(name: string): void;
}
