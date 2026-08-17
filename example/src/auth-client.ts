import { createAuthClient } from 'better-auth/react';

import { expoClient } from '@better-auth/expo/client';

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
 * MMKV-backed session storage. Nitro-powered, synchronous, encrypted at
 * rest via the OS keychain/keystore. Works in both bare RN and Expo — no
 * config plugin required.
 *
 * Pass `encryptionKey` on first init to enable encryption. In production
 * derive/persist that key via the platform keychain (e.g. via
 * `react-native-keychain`) rather than hardcoding it.
 */
const mmkv = createMMKV({
  id: 'nitro-passkey-example.auth',
  encryptionKey: 'change-me-in-production',
});

/**
 * Adapter that gives `expoClient`'s `storage` option the tiny surface it
 * needs (`getItem` / `setItem` / `deleteItem`). MMKV is synchronous, but
 * returning already-resolved Promises is fine — expo-client awaits them.
 */
const mmkvStorage = {
  getItem: (key: string) => mmkv.getString(key) ?? null,
  setItem: (key: string, value: string) => mmkv.set(key, value),
  removeItem: (key: string) => mmkv.remove(key),
};

export const authClient = createAuthClient({
  baseURL: BASE_URL,
  plugins: [
    // Session persistence + native cookie handling. `expoClient` is fine
    // in bare RN too; the name is historical.
    expoClient({
      scheme: 'nitropasskeyexample',
      storagePrefix: 'nitro-passkey-example',
      storage: mmkvStorage,
    }),
    // The native passkey plugin. Everything else stays stock better-auth.
    betterAuthPasskeyClient(),
  ],
});
