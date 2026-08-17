/**
 * Minimal WebAuthn JSON type surface used by this package.
 *
 * These mirror the shapes from `@simplewebauthn/types` (deprecated) /
 * `@simplewebauthn/browser` (v13+). We inline them so this package doesn't
 * depend on a deprecated types package or on `@simplewebauthn/browser` (which
 * pulls in DOM-only WebAuthn code that has no business in a native module).
 *
 * Everything binary here is base64url-encoded — that's how better-auth's
 * `/passkey/generate-*-options` and `/passkey/verify-*` endpoints exchange
 * payloads with the client.
 */

export type AuthenticatorTransportFuture =
  'ble' | 'cable' | 'hybrid' | 'internal' | 'nfc' | 'smart-card' | 'usb';

export type AuthenticatorAttachment = 'platform' | 'cross-platform';

export type UserVerificationRequirement =
  'required' | 'preferred' | 'discouraged';

/**
 * `PublicKeyCredentialCreationOptionsJSON` — the payload better-auth's
 * `/passkey/generate-register-options` returns. We only type the fields the
 * native side reads; everything else is passed through opaquely as JSON.
 */
export interface PublicKeyCredentialCreationOptionsJSON {
  rp: { id?: string; name: string };
  user: { id: string; name: string; displayName: string };
  challenge: string;
  pubKeyCredParams: Array<{ type: 'public-key'; alg: number }>;
  timeout?: number;
  excludeCredentials?: Array<{
    type: 'public-key';
    id: string;
    transports?: AuthenticatorTransportFuture[];
  }>;
  authenticatorSelection?: {
    authenticatorAttachment?: AuthenticatorAttachment;
    residentKey?: 'discouraged' | 'preferred' | 'required';
    requireResidentKey?: boolean;
    userVerification?: UserVerificationRequirement;
  };
  attestation?: 'none' | 'indirect' | 'direct' | 'enterprise';
  extensions?: Record<string, unknown>;
}

export interface PublicKeyCredentialRequestOptionsJSON {
  challenge: string;
  timeout?: number;
  rpId: string;
  allowCredentials?: Array<{
    type: 'public-key';
    id: string;
    transports?: AuthenticatorTransportFuture[];
  }>;
  userVerification?: UserVerificationRequirement;
  extensions?: Record<string, unknown>;
}

export interface RegistrationResponseJSON {
  id: string;
  rawId: string;
  type: 'public-key';
  response: {
    clientDataJSON: string;
    attestationObject: string;
    transports?: AuthenticatorTransportFuture[];
    publicKeyAlgorithm?: number;
    publicKey?: string;
    authenticatorData?: string;
  };
  clientExtensionResults: Record<string, unknown>;
  authenticatorAttachment?: AuthenticatorAttachment;
}

export interface AuthenticationResponseJSON {
  id: string;
  rawId: string;
  type: 'public-key';
  response: {
    clientDataJSON: string;
    authenticatorData: string;
    signature: string;
    userHandle?: string;
  };
  clientExtensionResults: Record<string, unknown>;
  authenticatorAttachment?: AuthenticatorAttachment;
}
