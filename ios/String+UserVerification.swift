import AuthenticationServices
import Foundation

extension String {
  func toASUserVerificationPreference() -> ASAuthorizationPublicKeyCredentialUserVerificationPreference {
    switch self.lowercased() {
    case "required": return .required
    case "discouraged": return .discouraged
    default: return .preferred
    }
  }
}
