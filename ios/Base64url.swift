import Foundation

enum Base64URL {
  static func decode(_ str: String) -> Data? {
    let base64 =
      str
      .replacingOccurrences(of: "-", with: "+")
      .replacingOccurrences(of: "_", with: "/")
      .padding(toLength: ((str.count + 3) / 4) * 4, withPad: "=", startingAt: 0)
    return Data(base64Encoded: base64)
  }

  static func encode(_ data: Data) -> String {
    data.base64EncodedString()
      .replacingOccurrences(of: "=", with: "")
      .replacingOccurrences(of: "+", with: "-")
      .replacingOccurrences(of: "/", with: "_")
  }
}