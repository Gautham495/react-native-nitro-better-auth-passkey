require "json"

package = JSON.parse(File.read(File.join(__dir__, "package.json")))

Pod::Spec.new do |s|
  s.name         = "NitroBetterAuthPasskey"
  s.version      = package["version"]
  s.summary      = package["description"]
  s.homepage     = package["homepage"]
  s.license      = package["license"]
  s.authors      = package["author"]

  s.platforms    = { :ios => "16.4" }
  s.source       = { :git => "https://github.com/gautham495/react-native-nitro-better-auth-passkey.git", :tag => "#{s.version}" }

  s.source_files = [
    "ios/**/*.{swift,h,m,mm,cpp,hpp}",
    "nitrogen/generated/ios/**/*.{swift,h,m,mm,cpp,hpp}",
  ]

  s.frameworks = "AuthenticationServices"

  load 'nitrogen/generated/ios/NitroBetterAuthPasskey+autolinking.rb'
  add_nitrogen_files(s)

  s.dependency "React-jsi"
  s.dependency "React-callinvoker"

  install_modules_dependencies(s)
end