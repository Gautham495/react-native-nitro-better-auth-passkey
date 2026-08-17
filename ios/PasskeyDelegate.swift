import AuthenticationServices
import Foundation

final class PasskeyDelegate: NSObject,
  ASAuthorizationControllerDelegate,
  ASAuthorizationControllerPresentationContextProviding
{
  private let onRegistration: (ASAuthorizationPlatformPublicKeyCredentialRegistration) -> Void
  private let onAssertion: (ASAuthorizationPlatformPublicKeyCredentialAssertion) -> Void
  private let onError: (Error) -> Void
  weak var presentationAnchor: ASPresentationAnchor?

  init(
    onRegistration: @escaping (ASAuthorizationPlatformPublicKeyCredentialRegistration) -> Void,
    onAssertion: @escaping (ASAuthorizationPlatformPublicKeyCredentialAssertion) -> Void,
    onError: @escaping (Error) -> Void
  ) {
    self.onRegistration = onRegistration
    self.onAssertion = onAssertion
    self.onError = onError
  }

  func presentationAnchor(for controller: ASAuthorizationController) -> ASPresentationAnchor {
    return presentationAnchor ?? ASPresentationAnchor()
  }

  func authorizationController(
    controller: ASAuthorizationController,
    didCompleteWithAuthorization authorization: ASAuthorization
  ) {
    if let reg = authorization.credential as? ASAuthorizationPlatformPublicKeyCredentialRegistration {
      onRegistration(reg)
    } else if let asrt = authorization.credential as? ASAuthorizationPlatformPublicKeyCredentialAssertion {
      onAssertion(asrt)
    } else {
      onError(
        NSError(
          domain: "NitroBetterAuthPasskey",
          code: -2,
          userInfo: [NSLocalizedDescriptionKey: "Unsupported credential type"]
        )
      )
    }
    PasskeyDelegateRetainer.release(self)
  }

  func authorizationController(
    controller: ASAuthorizationController,
    didCompleteWithError error: Error
  ) {
    onError(error)
    PasskeyDelegateRetainer.release(self)
  }
}

/// Holds strong references to in-flight ASAuthorizationController delegates
/// because `ASAuthorizationController.delegate` is a weak reference.
enum PasskeyDelegateRetainer {
  private static let lock = NSLock()
  private static var retained: [PasskeyDelegate] = []

  static func retain(_ d: PasskeyDelegate) {
    lock.lock()
    defer { lock.unlock() }
    retained.append(d)
  }

  static func release(_ d: PasskeyDelegate) {
    lock.lock()
    defer { lock.unlock() }
    retained.removeAll { $0 === d }
  }
}