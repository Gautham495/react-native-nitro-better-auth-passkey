import type { BetterAuthClientPlugin, ClientStore } from '@better-auth/core';
import type { Passkey as PasskeyRecord } from '@better-auth/passkey/client';
import { passkeyClient } from '@better-auth/passkey/client';
import type { BetterFetch } from '@better-fetch/fetch';
import type {
  AuthenticationResponseJSON,
  AuthenticatorTransportFuture,
  PublicKeyCredentialCreationOptionsJSON,
  PublicKeyCredentialRequestOptionsJSON,
  RegistrationResponseJSON,
} from './types/webauthn';
import type { Session, User } from 'better-auth';
import type { BetterFetchOption } from 'better-auth/client';
import { atom } from 'nanostores';

import { NativePasskey } from './Passkey';

/**
 * Native-only better-auth passkey client backed by Nitro Modules.
 *
 * Drop-in replacement for better-auth's `passkeyClient()` on
 * React Native (iOS + Android). There is no web fallback — use the
 * stock `passkeyClient()` on web.
 *
 * @example
 * ```ts
 * import { createAuthClient } from 'better-auth/react'
 * import { betterAuthPasskeyClient } from 'react-native-nitro-better-auth-passkey'
 *
 * export const authClient = createAuthClient({
 *   baseURL: 'https://api.example.com',
 *   plugins: [betterAuthPasskeyClient()],
 * })
 * ```
 */
export const betterAuthPasskeyClient = () => {
  const baseClient = passkeyClient();
  const $listPasskeys = atom<number>(0);

  return {
    id: baseClient.id,
    $InferServerPlugin: baseClient.$InferServerPlugin,
    getActions: ($fetch: BetterFetch, $store: ClientStore) =>
      getPasskeyActionsNative($fetch, { $listPasskeys, $store }),
    getAtoms: baseClient.getAtoms,
    pathMethods: baseClient.pathMethods,
    atomListeners: baseClient.atomListeners,
  } satisfies BetterAuthClientPlugin;
};

const buildCancelledError = (e: unknown) => {
  let message = 'auth cancelled';
  if (e instanceof Error) {
    message = e.message;
  }
  return {
    data: null,
    error: {
      code: 'AUTH_CANCELLED',
      message,
      status: 400,
      statusText: 'BAD_REQUEST',
    },
  };
};

export const getPasskeyActionsNative = (
  $fetch: BetterFetch,
  {
    $listPasskeys,
    $store,
  }: {
    $listPasskeys: ReturnType<typeof atom<number>>;
    $store: ClientStore;
  }
) => {
  const signInPasskey = async (
    opts?: {
      autoFill?: boolean;
      fetchOptions?: BetterFetchOption;
    },
    options?: BetterFetchOption
  ) => {
    const response = await $fetch<PublicKeyCredentialRequestOptionsJSON>(
      '/passkey/generate-authenticate-options',
      { method: 'GET' }
    );
    if (!response.data) return response;

    try {
      const nativeResult = await NativePasskey.authenticate({
        optionsJSON: JSON.stringify(response.data),
        useAutofill: opts?.autoFill,
      });

      const assertion: AuthenticationResponseJSON = {
        id: nativeResult.id,
        rawId: nativeResult.rawId,
        type: nativeResult.type as 'public-key',
        response: {
          clientDataJSON: nativeResult.clientDataJSON,
          authenticatorData: nativeResult.authenticatorData,
          signature: nativeResult.signature,
          userHandle: nativeResult.userHandle,
        },
        clientExtensionResults: {},
        authenticatorAttachment: nativeResult.authenticatorAttachment as
          'platform' | 'cross-platform' | undefined,
      };

      const verified = await $fetch<{ session: Session; user: User }>(
        '/passkey/verify-authentication',
        {
          body: { response: assertion },
          ...opts?.fetchOptions,
          ...options,
          method: 'POST',
        }
      );

      if (verified.data) {
        $listPasskeys.set(Math.random());
        $store.notify('$sessionSignal');
      }
      return verified;
    } catch (e) {
      console.error('Passkey sign-in error:', e);
      return buildCancelledError(e);
    }
  };

  const registerPasskey = async (
    opts?: {
      fetchOptions?: BetterFetchOption;
      name?: string;
      authenticatorAttachment?: 'platform' | 'cross-platform';
      useAutoRegister?: boolean;
    },
    fetchOpts?: BetterFetchOption
  ) => {
    const optionsRes = await $fetch<PublicKeyCredentialCreationOptionsJSON>(
      '/passkey/generate-register-options',
      {
        method: 'GET',
        query: {
          ...(opts?.authenticatorAttachment && {
            authenticatorAttachment: opts.authenticatorAttachment,
          }),
          ...(opts?.name && { name: opts.name }),
        },
      }
    );

    if (!optionsRes.data) return optionsRes;

    try {
      const nativeResult = await NativePasskey.register({
        optionsJSON: JSON.stringify(optionsRes.data),
        useAutoRegister: opts?.useAutoRegister,
      });

      const attestation: RegistrationResponseJSON = {
        id: nativeResult.id,
        rawId: nativeResult.rawId,
        type: nativeResult.type as 'public-key',
        response: {
          clientDataJSON: nativeResult.clientDataJSON,
          attestationObject: nativeResult.attestationObject,
          transports: nativeResult.transports as AuthenticatorTransportFuture[],
        },
        clientExtensionResults: {},
        authenticatorAttachment: nativeResult.authenticatorAttachment as
          'platform' | 'cross-platform' | undefined,
      };

      const verified = await $fetch<{ passkey: PasskeyRecord }>(
        '/passkey/verify-registration',
        {
          ...opts?.fetchOptions,
          ...fetchOpts,
          body: {
            response: attestation,
            name: opts?.name,
          },
          method: 'POST',
        }
      );
      if (!verified.data) return verified;
      $listPasskeys.set(Math.random());
      return verified;
    } catch (e) {
      console.error('Passkey registration error:', e);
      return buildCancelledError(e);
    }
  };

  return {
    signIn: {
      passkey: signInPasskey,
    },
    passkey: {
      addPasskey: registerPasskey,
    },
    $Infer: {},
  };
};
