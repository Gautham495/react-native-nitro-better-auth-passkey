import { createAuthClient } from 'better-auth/react';
import { betterAuthPasskeyClient } from 'react-native-nitro-better-auth-passkey';
import { createMMKV } from 'react-native-mmkv';

/**
 * The better-auth server this example talks to. Point this at your own
 * better-auth deployment. `rpID` on the server must match the host, and
 * the associated-domain / assetlinks.json files must be published at
 * `/.well-known/` on the same host — see the package README.
 */
const BASE_URL = 'https://auth.example.com';

/**
 * MMKV-backed encrypted store. Works in bare RN — no expo modules
 * required. Pass a real encryption key in production (e.g. one derived
 * from the OS keychain).
 */
const storage = createMMKV({
  id: 'nitro-passkey-example.auth',
  encryptionKey: 'change-me-in-production',
});

const COOKIE_KEY = 'ba.cookie';

/**
 * Manual cookie persistence for React Native.
 *
 * better-auth normally relies on the browser's cookie jar or on
 * `@better-auth/expo` to persist the session cookie between HTTP calls.
 * On bare RN we don't have either, so we intercept the fetch cycle
 * with better-fetch's `onRequest` / `onSuccess` hooks:
 *
 *   • On every request, attach the last-seen `Set-Cookie` value as
 *     an outgoing `Cookie` header.
 *   • On every response, capture `Set-Cookie` and persist it to MMKV.
 *
 * These hooks are void-returning — they mutate the context in place.
 * Returning a modified request object also works, but mutating is
 * what better-fetch's type system expects by default.
 */
export const authClient = createAuthClient({
  baseURL: BASE_URL,
  fetchOptions: {
    onRequest(context) {
      const stored = storage.getString(COOKIE_KEY);
      if (stored) {
        context.headers.set('Cookie', stored);
      }
    },
    onSuccess(context) {
      const setCookie = context.response.headers.get('set-cookie');
      if (setCookie) {
        // `set-cookie` may contain multiple cookies joined by comma;
        // we store the raw value and send it back verbatim, which is
        // what better-auth's own server-side middleware expects.
        storage.set(COOKIE_KEY, setCookie);
      }
    },
  },
  plugins: [betterAuthPasskeyClient()],
});

/**
 * Clear the persisted session cookie. Call this from your sign-out handler
 * to make sure the next launch starts unauthenticated even if the server
 * response was slow or failed.
 */
export const clearAuthStorage = () => {
  storage.remove(COOKIE_KEY);
};
