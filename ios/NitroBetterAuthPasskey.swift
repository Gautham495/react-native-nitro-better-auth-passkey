import AuthenticationServices
import Foundation
import NitroModules

final class NitroBetterAuthPasskey: HybridPasskeySpec {

  func register(input: RegisterPasskeyInput) throws -> Promise<RegistrationResponse> {
    let options = try PasskeyCreationOptions.parse(json: input.optionsJSON)
    let useAutoRegister = input.useAutoRegister ?? false
    let promise = Promise<RegistrationResponse>()

    DispatchQueue.main.async {
      self.performRegister(
        options: options,
        useAutoRegister: useAutoRegister,
        promise: promise
      )
    }
    return promise
  }

  func authenticate(input: AuthenticatePasskeyInput) throws -> Promise<AuthenticationResponse> {
    let options = try PasskeyRequestOptions.parse(json: input.optionsJSON)
    let useAutofill = input.useAutofill ?? false
    let promise = Promise<AuthenticationResponse>()

    DispatchQueue.main.async {
      self.performAuthenticate(
        options: options,
        useAutofill: useAutofill,
        promise: promise
      )
    }
    return promise
  }

  private func performRegister(
    options: PasskeyCreationOptions,
    useAutoRegister: Bool,
    promise: Promise<RegistrationResponse>
  ) {
    let provider = ASAuthorizationPlatformPublicKeyCredentialProvider(
      relyingPartyIdentifier: options.rpId
    )
    let passkeyName = options.userName.isEmpty ? options.userDisplayName : options.userName
    let request = provider.createCredentialRegistrationRequest(
      challenge: options.challenge,
      name: passkeyName,
      userID: options.userId
    )

    if #available(iOS 17.4, *) {
      request.excludedCredentials = options.excludeCredentials.map {
        ASAuthorizationPlatformPublicKeyCredentialDescriptor(credentialID: $0)
      }
    }
    if let uv = options.userVerification {
      request.userVerificationPreference = uv.toASUserVerificationPreference()
    }

    let delegate = PasskeyDelegate(
      onRegistration: { reg in
        let id = Base64URL.encode(reg.credentialID)
        promise.resolve(
          withResult: RegistrationResponse(
            id: id,
            rawId: id,
            type: "public-key",
            clientDataJSON: Base64URL.encode(reg.rawClientDataJSON),
            attestationObject: Base64URL.encode(reg.rawAttestationObject ?? Data()),
            transports: ["internal"],
            authenticatorAttachment: "platform"
          )
        )
      },
      onAssertion: { _ in
        promise.reject(withError: RuntimeError.error(withMessage: "Unexpected assertion during registration"))
      },
      onError: { error in
        promise.reject(withError: error)
      }
    )

    let controller = ASAuthorizationController(authorizationRequests: [request])
    controller.delegate = delegate
    controller.presentationContextProvider = delegate
    delegate.presentationAnchor = PresentationAnchor.current()
    PasskeyDelegateRetainer.retain(delegate)

    // Ignored on Apple platforms — accepted for API symmetry with Android.
    _ = useAutoRegister
    controller.performRequests()
  }

  private func performAuthenticate(
    options: PasskeyRequestOptions,
    useAutofill: Bool,
    promise: Promise<AuthenticationResponse>
  ) {
    let provider = ASAuthorizationPlatformPublicKeyCredentialProvider(
      relyingPartyIdentifier: options.rpId
    )
    let request = provider.createCredentialAssertionRequest(challenge: options.challenge)
    request.allowedCredentials = options.allowCredentials.map {
      ASAuthorizationPlatformPublicKeyCredentialDescriptor(credentialID: $0)
    }
    if let uv = options.userVerification {
      request.userVerificationPreference = uv.toASUserVerificationPreference()
    }

    let delegate = PasskeyDelegate(
      onRegistration: { _ in
        promise.reject(withError: RuntimeError.error(withMessage: "Unexpected registration during assertion"))
      },
      onAssertion: { asrt in
        let id = Base64URL.encode(asrt.credentialID)
        let userHandle: String?
        if let uid = asrt.userID, !uid.isEmpty {
          userHandle = Base64URL.encode(uid)
        } else {
          userHandle = nil
        }
        promise.resolve(
          withResult: AuthenticationResponse(
            id: id,
            rawId: id,
            type: "public-key",
            clientDataJSON: Base64URL.encode(asrt.rawClientDataJSON),
            authenticatorData: Base64URL.encode(asrt.rawAuthenticatorData),
            signature: Base64URL.encode(asrt.signature),
            userHandle: userHandle,
            authenticatorAttachment: "platform"
          )
        )
      },
      onError: { error in
        promise.reject(withError: error)
      }
    )

    let controller = ASAuthorizationController(authorizationRequests: [request])
    controller.delegate = delegate
    controller.presentationContextProvider = delegate
    delegate.presentationAnchor = PresentationAnchor.current()
    PasskeyDelegateRetainer.retain(delegate)

    if useAutofill, #available(iOS 16.0, *) {
      controller.performAutoFillAssistedRequests()
    } else {
      controller.performRequests()
    }
  }
}