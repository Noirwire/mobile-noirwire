Pod::Spec.new do |s|
  s.name           = 'BackupExclusion'
  s.version        = '1.0.0'
  s.summary        = 'Keeps a directory out of iCloud and computer backups.'
  s.description    = 'Sets the do-not-backup resource value on a directory the wallet stores its record in.'
  s.author         = 'NoirWire'
  s.homepage       = 'https://noirwire.com'
  s.license        = { :type => 'UNLICENSED' }
  s.platforms      = { :ios => '16.4' }
  s.source         = { git: '' }
  s.static_framework = true

  s.dependency 'ExpoModulesCore'

  s.pod_target_xcconfig = { 'DEFINES_MODULE' => 'YES' }
  s.source_files = '**/*.swift'
end
