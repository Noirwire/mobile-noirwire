import ExpoModulesCore

public class BackupExclusionModule: Module {
  public func definition() -> ModuleDefinition {
    Name("NoirwireBackupExclusion")

    // Marks a file or directory as excluded from iCloud and computer backups,
    // then reads the flag back so the caller learns whether it really holds.
    Function("excludeFromBackup") { (uri: String) -> Bool in
      guard var url = URL(string: uri), url.isFileURL else {
        throw Exception(name: "InvalidPath", description: "Not a file URL.")
      }
      var values = URLResourceValues()
      values.isExcludedFromBackup = true
      try url.setResourceValues(values)
      let stored = try url.resourceValues(forKeys: [.isExcludedFromBackupKey])
      return stored.isExcludedFromBackup == true
    }
  }
}
