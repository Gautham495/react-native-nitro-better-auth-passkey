export { betterAuthPasskeyClient } from './Plugin';

export { NativePasskey } from './Passkey';

export type {
  Passkey,
  RegisterPasskeyInput,
  AuthenticatePasskeyInput,
  RegistrationResponse,
  AuthenticationResponse,
} from './Passkey.nitro';

export type {
  AuthenticationResponseJSON,
  AuthenticatorAttachment,
  AuthenticatorTransportFuture,
  PublicKeyCredentialCreationOptionsJSON,
  PublicKeyCredentialRequestOptionsJSON,
  RegistrationResponseJSON,
  UserVerificationRequirement,
} from './types/webauthn';
