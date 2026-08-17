import type { HybridObject } from 'react-native-nitro-modules';

/**
 * Registration options as delivered by better-auth's
 * `/passkey/generate-register-options` endpoint.
 *
 * This is `PublicKeyCredentialCreationOptionsJSON` (base64url-encoded),
 * but Nitro needs an explicit named struct — anything the native side
 * doesn't care about is passed through as an opaque JSON string so we
 * don't have to model every optional WebAuthn field.
 */
export interface RegisterPasskeyInput {
  /**
   * The JSON.stringify'd `PublicKeyCredentialCreationOptionsJSON` from
   * better-auth. Native code parses this and pulls out the fields it needs
   * (rp.id, user.id, user.name, challenge, excludeCredentials,
   * authenticatorSelection.userVerification).
   */
  optionsJSON: string;
  /**
   * iOS 16+ / Android — hint the OS to prefer immediately available
   * credentials at creation time. Ignored where unsupported.
   */
  useAutoRegister?: boolean;
}

/**
 * Authentication options as delivered by better-auth's
 * `/passkey/generate-authenticate-options` endpoint
 * (`PublicKeyCredentialRequestOptionsJSON`, base64url-encoded).
 */
export interface AuthenticatePasskeyInput {
  optionsJSON: string;
  /**
   * iOS 16+ — enable passkey autofill assisted requests.
   * Android — hint the OS to prefer immediately available credentials.
   */
  useAutofill?: boolean;
}

/**
 * Registration response shape that better-auth's
 * `/passkey/verify-registration` endpoint accepts.
 *
 * All binary fields are base64url-encoded strings, matching
 * `RegistrationResponseJSON` from @simplewebauthn/types.
 */
export interface RegistrationResponse {
  id: string;
  rawId: string;
  type: string;
  clientDataJSON: string;
  attestationObject: string;
  transports: string[];
  authenticatorAttachment?: string;
}

/**
 * Authentication response shape that better-auth's
 * `/passkey/verify-authentication` endpoint accepts
 * (`AuthenticationResponseJSON` from @simplewebauthn/types).
 */
export interface AuthenticationResponse {
  id: string;
  rawId: string;
  type: string;
  clientDataJSON: string;
  authenticatorData: string;
  signature: string;
  userHandle?: string;
  authenticatorAttachment?: string;
}

/**
 * Native platform passkey (WebAuthn) bridge for better-auth.
 *
 * Wraps `ASAuthorizationController` on iOS and Android Credential Manager.
 * All calls are async and reject with a descriptive error on user cancel
 * or platform failure — callers should surface these to better-auth as
 * `AUTH_CANCELLED`.
 */
export interface Passkey extends HybridObject<{
  ios: 'swift';
  android: 'kotlin';
}> {
  /**
   * Create a new platform passkey. Presents the system sheet.
   */
  register(input: RegisterPasskeyInput): Promise<RegistrationResponse>;

  /**
   * Assert an existing platform passkey. Presents the system sheet
   * (or an autofill affordance when `useAutofill` is set on iOS 16+).
   */
  authenticate(
    input: AuthenticatePasskeyInput
  ): Promise<AuthenticationResponse>;
}
