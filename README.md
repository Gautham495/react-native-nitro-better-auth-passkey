<a href="https://gauthamvijay.com">
  <picture>
    <img alt="react-native-nitro-better-auth-passkey-banner" src="./docs/img/banner.png" />
  </picture>
</a>

# react-native-nitro-better-auth-passkey

A **React Native Nitro Module** that adds native **passkey (WebAuthn)** support to [**better-auth**](https://better-auth.com) on iOS and Android. Uses **OS-native credential APIs** — `ASAuthorizationController` on iOS and `CredentialManager` on Android — wrapped as a drop-in `better-auth` client plugin.

* 🔐 **Drop-in better-auth plugin** — Swap `passkeyClient()` for `betterAuthPasskeyClient()`, keep the same API
* 🍎 **iOS native** — `ASAuthorizationPlatformPublicKeyCredentialProvider`, no third-party WebAuthn deps
* 🤖 **Android native** — Jetpack `CredentialManager` with Play Services passkey provider
* ⚡ **Fully Nitro** — Zero JS bridge overhead, statically compiled JSI bindings
* 🎯 **Better-auth only, Nitro only** — No Expo modules, no legacy bridge, no web fallback bloat
* 🪶 **Tiny** — Two async methods, no ML models, no assets to bundle
* 📱 **Autofill support** — iOS 16+ passkey autofill via `performAutoFillAssistedRequests()`

---

> [!IMPORTANT]
>
> * Requires React Native **0.75+** with the **New Architecture** enabled.
> * Requires **`better-auth` 1.6+** with the `@better-auth/passkey` server plugin.
> * Must be tested on a **physical device** — passkey UI does not work on iOS Simulator or Android Emulator.
> * iOS requires **iOS 15.1+** (`ASAuthorizationPlatformPublicKeyCredentialProvider`). Android requires **API 28+** and Google Play Services **23.30+**.
> * For **web**, use the stock `passkeyClient()` from `@better-auth/passkey/client`. This package is native-only by design.

---

## 📦 Installation

```bash
npm install react-native-nitro-better-auth-passkey react-native-nitro-modules
npm install better-auth @better-auth/passkey @better-fetch/fetch nanostores
```

```bash
cd ios && pod install
```

> [!NOTE]
> This package uses **OS-native credential APIs** on both platforms.
> iOS uses Apple's **AuthenticationServices** framework — built into iOS, no extra dependencies.
> Android uses Jetpack **Credential Manager** (`androidx.credentials:credentials:1.3.0`) backed by Google Play Services for passkey storage — no model files, no downloads.
> **Nothing to bundle. Nothing to convert. Nothing to configure per-platform beyond the WebAuthn associated-domain files.**

---

## 🧠 Overview

| Feature | Description |
| --- | --- |
| **Drop-in client** | `betterAuthPasskeyClient()` mirrors better-auth's stock `passkeyClient()` — same `signIn.passkey()` and `passkey.addPasskey()` shape. |
| **Native credential UI** | System passkey sheet on both platforms via `ASAuthorizationController` (iOS) and `CredentialManager.createCredential` / `getCredential` (Android). |
| **Autofill assist** | iOS 16+ can surface passkey suggestions inline in text fields via `performAutoFillAssistedRequests()`. |
| **Auto-register hint** | Android Credential Manager `preferImmediatelyAvailableCredentials` toggle for silent re-enrollment flows. |
| **Origin forwarding (Android)** | Uses `SET_ORIGIN` (API 34+) to forward your app's HTTPS origin to Credential Manager when the permission is granted; falls back transparently when not. |
| **Nickname passthrough (Android)** | Rewrites `user.displayName` to match `user.name` before presenting the system dialog, so each passkey nickname shows up in the system UI instead of a static display name. |
| **Cancellation semantics** | User cancel and OS errors reject the native promise; the plugin wraps them as `{ code: 'AUTH_CANCELLED' }` in the better-auth response object. |
| **Low-level access** | `NativePasskey` HybridObject exported directly for callers who want to skip the better-auth wrapper. |

---

## 🔧 Setup

### No Model File, No Extra SDK

Unlike libraries that ship a WebAuthn implementation in JS, this library **delegates entirely to the OS**:

* **iOS:** `AuthenticationServices` is a system framework — already on every iPhone running iOS 15.1+.
* **Android:** `CredentialManager` is a Jetpack library backed by Google Play Services — passkey storage and sync are managed by the OS.

### Server — better-auth passkey plugin

Configure `better-auth` with the `passkey` plugin as normal. Make sure `rpID`, `rpName`, and `origin` match the public domain your app will use, and add every Android signing SHA-256 as an `android:apk-key-hash:<BASE64_SHA256>` entry in `origin`.

```ts
import { betterAuth } from 'better-auth'
import { passkey } from '@better-auth/passkey'

export const auth = betterAuth({
  plugins: [
    passkey({
      rpID: 'auth.example.com',
      rpName: 'My App',
      origin: [
        'https://auth.example.com',
        'android:apk-key-hash:AbCdEf...=',
        'android:apk-key-hash:XyZ123...=',
      ],
    }),
  ],
})
```

### iOS — Associated Domains

1. Enable the **Associated Domains** capability in Xcode (or via `expo prebuild` config `ios.associatedDomains`).
2. Add `webcredentials:` entries for every relying-party domain:

   ```json
   {
     "expo": {
       "ios": {
         "associatedDomains": ["webcredentials:auth.example.com"]
       }
     }
   }
   ```

3. Host an `apple-app-site-association` file at `https://auth.example.com/.well-known/apple-app-site-association`:

   ```json
   {
     "applinks": { "apps": [], "details": [] },
     "webcredentials": {
       "apps": ["<TEAMID>.com.example.myapp"]
     }
   }
   ```

   * No file extension. Serve as `application/json`.
   * `<TEAMID>` is your Apple developer team ID; the bundle identifier must match your release build.

### Android — Digital Asset Links

1. Host `https://auth.example.com/.well-known/assetlinks.json`:

   ```json
   [
     {
       "relation": ["delegate_permission/common.handle_all_urls"],
       "target": {
         "namespace": "android_app",
         "package_name": "com.example.myapp",
         "sha256_cert_fingerprints": ["12:34:56:...:AB"]
       }
     }
   ]
   ```

   * Include **every** signing fingerprint (debug, release, Play App Signing).
2. Ensure `rpID` on the server exactly matches the host portion of the HTTPS domain (`auth.example.com`).
3. **Optional (API 34+):** Request `android.permission.CREDENTIAL_MANAGER_SET_ORIGIN` in your app's `AndroidManifest.xml` to forward your app's HTTPS origin to Credential Manager. Without it, the module falls back to the default origin — you can skip it if you don't need per-domain attribution.

---

## ⚙️ Usage

### Basic — Drop-in better-auth client

```tsx
import { createAuthClient } from 'better-auth/react'
import { betterAuthPasskeyClient } from 'react-native-nitro-better-auth-passkey'

export const authClient = createAuthClient({
  baseURL: 'https://api.example.com',
  plugins: [betterAuthPasskeyClient()],
})

// Register a new passkey
await authClient.passkey.addPasskey({ name: 'My iPhone' })

// Sign in with an existing passkey
await authClient.signIn.passkey()
```

Nothing else changes. Every non-passkey better-auth call routes through the standard client. Only the WebAuthn credential creation and assertion steps go through native.

---

## 🧩 API Reference

### Client plugin

```ts
betterAuthPasskeyClient(): BetterAuthClientPlugin
```

Register alongside the rest of your better-auth client plugins.

### Client actions

```ts
// Register
authClient.passkey.addPasskey(opts?: {
  name?: string
  authenticatorAttachment?: 'platform' | 'cross-platform'
  useAutoRegister?: boolean            // Android: prefer immediately available credentials
  fetchOptions?: BetterFetchOption
}): Promise<{ data: { passkey: Passkey } | null, error: ... }>

// Sign in
authClient.signIn.passkey(opts?: {
  autoFill?: boolean                   // iOS 16+: enable passkey autofill assisted request
  fetchOptions?: BetterFetchOption
}): Promise<{ data: { session, user } | null, error: ... }>
```

Both calls return the standard better-auth response envelope. On user cancellation or native failure, `data` is `null` and `error.code` is `'AUTH_CANCELLED'`.

### Low-level Nitro HybridObject

For advanced use cases (custom auth flows, non-better-auth backends), the raw Nitro object is exported:

```ts
import { NativePasskey } from 'react-native-nitro-better-auth-passkey'

const registration = await NativePasskey.register({
  optionsJSON: JSON.stringify(publicKeyCredentialCreationOptionsJSON),
  useAutoRegister: false,
})
// → { id, rawId, type, clientDataJSON, attestationObject, transports, authenticatorAttachment }

const assertion = await NativePasskey.authenticate({
  optionsJSON: JSON.stringify(publicKeyCredentialRequestOptionsJSON),
  useAutofill: false,
})
// → { id, rawId, type, clientDataJSON, authenticatorData, signature, userHandle?, authenticatorAttachment }
```

All binary fields (`rawId`, `clientDataJSON`, `attestationObject`, `authenticatorData`, `signature`, `userHandle`) are **base64url-encoded strings** matching the `RegistrationResponseJSON` / `AuthenticationResponseJSON` shapes from the WebAuthn Level 3 JSON encoding. The types are re-exported from this package — no extra dependency needed.

---

## 🚦 Error Handling

Native cancellation and failures reject with an `Error`. The better-auth plugin wraps them:

```ts
const res = await authClient.signIn.passkey()
if (res.error) {
  if (res.error.statusText === 'AUTH_CANCELLED') {
    // User dismissed the sheet, or the OS rejected the request
    // (no matching passkey, associated-domain mismatch, biometric unavailable, etc.)
  }
}
```

The native error's `message` is preserved in `res.error.message`. On iOS it's the `NSError.localizedDescription`; on Android it's the `CreateCredentialException` / `GetCredentialException` message.

---

## 🏗️ Architecture — Native-Only vs Web-Compatible

| | This library | Typical WebAuthn RN libraries |
| --- | --- | --- |
| **iOS** | `ASAuthorizationController` (built-in) | JS WebAuthn polyfill or `expo-*` wrappers |
| **Android** | Jetpack `CredentialManager` (Play Services) | Custom FIDO2 client, deprecated `Fido` APIs |
| **Web fallback** | None — use `@better-auth/passkey/client` directly | Bundled `@simplewebauthn/browser` |
| **Bridge** | Nitro (statically compiled JSI) | Old React Native bridge or TurboModules |
| **Target** | better-auth only | Multi-server, generic WebAuthn |
| **App size impact** | ~150 KB | 1-3 MB (SDK + polyfills) |

Deliberately narrow scope: this package exists to make better-auth passkeys work well on React Native. Anything outside that is out of scope.

---

## 🧩 Supported Platforms

| Platform | Status | Notes |
| --- | --- | --- |
| **iOS** | ✅ Supported | Physical device, iOS 15.1+ |
| **Android** | ✅ Supported | API 28+, Play Services 23.30+ |
| **macOS** | ⚠️ Best-effort | Same native code path as iOS via AuthenticationServices; needs community testing |
| **Web** | ❌ Not supported | Use stock `@better-auth/passkey/client` on web |
| **iOS Simulator** | ❌ Not supported | Passkey UI unavailable in simulator |
| **Android Emulator** | ❌ Not supported | Requires Play Services + biometrics |

---

## 📊 App Size Impact

| Component | Size |
| --- | --- |
| Nitro module code (Swift + Kotlin) | ~150 KB |
| `AuthenticationServices` (iOS, built-in) | ~0 KB (system framework) |
| `androidx.credentials` + play-services-auth | ~500 KB (shared with other libs on most apps) |
| **Total new addition** | **~150 KB (iOS)** / **~650 KB (Android)** |

---

## 🛡️ Safety Notes

| Feature | Description |
| --- | --- |
| **Server-driven challenges** | Every `optionsJSON` comes from better-auth's `/generate-*-options` endpoint — never constructed on the client. |
| **Origin binding** | On Android, the module forwards `https://<rpId>` as the request origin when `SET_ORIGIN` is granted, so the credential is bound to the correct RP. |
| **Delegate retention** | iOS holds a strong reference to the `ASAuthorizationController` delegate for the lifetime of the request — cancellation races don't leak or crash. |
| **No plaintext credentials** | Only base64url-encoded WebAuthn payloads cross the JS bridge. Private key material stays in the Secure Enclave / Android Keystore. |
| **User-visible sheet** | Every operation triggers the OS-controlled system sheet. The library cannot silently authenticate. |

---

## 🤝 Contributing

PRs welcome — especially for macOS validation and additional authenticator preferences.

* [Development Workflow](CONTRIBUTING.md#development-workflow)
* [Sending a PR](CONTRIBUTING.md#sending-a-pull-request)
* [Code of Conduct](CODE_OF_CONDUCT.md)

---

## 🪪 License

MIT © [**Gautham Vijayan**](https://gauthamvijay.com)

---

Made with ❤️ and [**Nitro Modules**](https://nitro.margelo.com) + [**better-auth**](https://better-auth.com) + [**AuthenticationServices**](https://developer.apple.com/documentation/authenticationservices) + [**Credential Manager**](https://developer.android.com/training/sign-in/passkeys)