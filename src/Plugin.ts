import type { ClientStore } from '@better-auth/core';
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

import { NativePasskey } from './Passkey';

/**
 * Minimal nanostores-compatible atom. Just enough shape for
 * better-auth's `getPasskeyActions` and its `atomListeners` to be happy
 * without pulling nanostores in as a dependency.
 *
 * If a consumer already uses nanostores elsewhere, this atom is
 * observationally identical — same `get`/`set`/`subscribe` surface.
 */
type Listener<T> = (value: T) => void;
interface MiniAtom<T> {
  get(): T;
  set(value: T): void;
  subscribe(listener: Listener<T>): () => void;
  listen(listener: Listener<T>): () => void;
}
const atom = <T>(initial: T): MiniAtom<T> => {
  let value = initial;
  const listeners = new Set<Listener<T>>();
  const subscribe = (listener: Listener<T>) => {
    listeners.add(listener);
    return () => {
      listeners.delete(listener);
    };
  };
  return {
    get: () => value,
    set: (next: T) => {
      value = next;
      for (const l of listeners) l(value);
    },
    subscribe,
    // nanostores exposes both — better-auth may call either.
    listen: subscribe,
  };
};

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

  // Cast the return to the base client's shape so that
  // `authClient.signIn.passkey` and `authClient.passkey.addPasskey`
  // stay properly typed on the consumer's `createAuthClient()` result.
  // The base `passkeyClient()` already declares `$InferServerPlugin`,
  // `getAtoms`, `pathMethods`, `atomListeners`, and — via type inference
  // from `getActions` — the action shape that better-auth exposes on
  // the auth client. We reuse all of that unchanged; we only swap the
  // runtime implementation of `getActions` for our native one.
  const plugin: typeof baseClient = {
    ...baseClient,
    getActions: ($fetch: BetterFetch, $store: ClientStore) =>
      getPasskeyActionsNative($fetch, {
        $listPasskeys,
        $store,
      }) as ReturnType<NonNullable<typeof baseClient.getActions>>,
  };
  return plugin;
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
    $listPasskeys: MiniAtom<number>;
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
      const nativeResult = await NativePasskey.createPasskey({
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
