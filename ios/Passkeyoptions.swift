import Foundation
import NitroModules

struct PasskeyCreationOptions {
  let rpId: String
  let challenge: Data
  let userId: Data
  let userName: String
  let userDisplayName: String
  let excludeCredentials: [Data]
  let userVerification: String?

  static func parse(json: String) throws -> PasskeyCreationOptions {
    guard let data = json.data(using: .utf8),
      let obj = try JSONSerialization.jsonObject(with: data) as? [String: Any]
    else {
      throw RuntimeError.error(withMessage: "optionsJSON is not valid JSON")
    }

    guard let rp = obj["rp"] as? [String: Any],
      let rpId = rp["id"] as? String
    else {
      throw RuntimeError.error(withMessage: "Missing rp.id in optionsJSON")
    }
    guard let challengeStr = obj["challenge"] as? String,
      let challenge = Base64URL.decode(challengeStr)
    else {
      throw RuntimeError.error(withMessage: "Invalid or missing challenge in optionsJSON")
    }
    guard let user = obj["user"] as? [String: Any],
      let userIdStr = user["id"] as? String,
      let userId = Base64URL.decode(userIdStr)
    else {
      throw RuntimeError.error(withMessage: "Invalid or missing user.id in optionsJSON")
    }

    let userName = (user["name"] as? String) ?? ""
    let userDisplayName = (user["displayName"] as? String) ?? userName

    var excludes: [Data] = []
    if let arr = obj["excludeCredentials"] as? [[String: Any]] {
      for entry in arr {
        if let idStr = entry["id"] as? String, let id = Base64URL.decode(idStr) {
          excludes.append(id)
        }
      }
    }

    let uv = (obj["authenticatorSelection"] as? [String: Any])?["userVerification"] as? String

    return PasskeyCreationOptions(
      rpId: rpId,
      challenge: challenge,
      userId: userId,
      userName: userName,
      userDisplayName: userDisplayName,
      excludeCredentials: excludes,
      userVerification: uv
    )
  }
}

struct PasskeyRequestOptions {
  let rpId: String
  let challenge: Data
  let allowCredentials: [Data]
  let userVerification: String?

  static func parse(json: String) throws -> PasskeyRequestOptions {
    guard let data = json.data(using: .utf8),
      let obj = try JSONSerialization.jsonObject(with: data) as? [String: Any]
    else {
      throw RuntimeError.error(withMessage: "optionsJSON is not valid JSON")
    }

    guard let rpId = obj["rpId"] as? String else {
      throw RuntimeError.error(withMessage: "Missing rpId in optionsJSON")
    }
    guard let challengeStr = obj["challenge"] as? String,
      let challenge = Base64URL.decode(challengeStr)
    else {
      throw RuntimeError.error(withMessage: "Invalid or missing challenge in optionsJSON")
    }

    var allows: [Data] = []
    if let arr = obj["allowCredentials"] as? [[String: Any]] {
      for entry in arr {
        if let idStr = entry["id"] as? String, let id = Base64URL.decode(idStr) {
          allows.append(id)
        }
      }
    }

    let uv = obj["userVerification"] as? String

    return PasskeyRequestOptions(
      rpId: rpId,
      challenge: challenge,
      allowCredentials: allows,
      userVerification: uv
    )
  }
}