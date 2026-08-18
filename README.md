<a href="https://gauthamvijay.com">
  <picture>
    <img alt="react-native-nitro-better-auth-passkey-banner" src="./docs/img/banner.png" />
  </picture>
</a>

# react-native-nitro-better-auth-passkey

A **React Native Nitro Module** that adds native **passkey (WebAuthn)** support to [**better-auth**](https://better-auth.com) on iOS and Android. Uses **OS-native credential APIs** — `ASAuthorizationController` on iOS and `CredentialManager` on Android — wrapped as a drop-in `better-auth` client plugin.

- 🔐 **Drop-in better-auth plugin** — Swap `passkeyClient()` for `betterAuthPasskeyClient()`, keep the same API
- 🍎 **iOS native** — `ASAuthorizationPlatformPublicKeyCredentialProvider`, no third-party WebAuthn deps
- 🤖 **Android native** — Jetpack `CredentialManager` with Play Services passkey provider
- ⚡ **Fully Nitro** — Zero JS bridge overhead, statically compiled JSI bindings
- 🎯 **Better-auth only, Nitro only** — No Expo modules, no legacy bridge, no web fallback bloat
- 🪶 **Tiny** — Two async methods, no ML models, no assets to bundle
- 📱 **Autofill support** — iOS 16+ passkey autofill via `performAutoFillAssistedRequests()`

---

> [!IMPORTANT]
>
> - Requires React Native **0.81+** with the **New Architecture** enabled.
> - Requires **`better-auth` 1.6.26++** with the `@better-auth/passkey` server plugin.
> - Must be tested on a **physical device** — passkey UI does not work on iOS Simulator or Android Emulator.
> - iOS requires **iOS 15.1+** (`ASAuthorizationPlatformPublicKeyCredentialProvider`). Android requires **API 28+** and Google Play Services **23.30+**.

---

## 📦 Installation

```bash
npm install react-native-nitro-better-auth-passkey react-native-nitro-modules
npm install better-auth @better-auth/passkey @better-fetch/fetch
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

| Feature                            | Description                                                                                                                                                                |
| ---------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Drop-in client**                 | `betterAuthPasskeyClient()` mirrors better-auth's stock `passkeyClient()` — same `signIn.passkey()` and `passkey.addPasskey()` shape.                                      |
| **Native credential UI**           | System passkey sheet on both platforms via `ASAuthorizationController` (iOS) and `CredentialManager.createCredential` / `getCredential` (Android).                         |
| **Autofill assist**                | iOS 16+ can surface passkey suggestions inline in text fields via `performAutoFillAssistedRequests()`.                                                                     |
| **Auto-register hint**             | Android Credential Manager `preferImmediatelyAvailableCredentials` toggle for silent re-enrollment flows.                                                                  |
| **Origin forwarding (Android)**    | Uses `SET_ORIGIN` (API 34+) to forward your app's HTTPS origin to Credential Manager when the permission is granted; falls back transparently when not.                    |
| **Nickname passthrough (Android)** | Rewrites `user.displayName` to match `user.name` before presenting the system dialog, so each passkey nickname shows up in the system UI instead of a static display name. |
| **Cancellation semantics**         | User cancel and OS errors reject the native promise; the plugin wraps them as `{ code: 'AUTH_CANCELLED' }` in the better-auth response object.                             |
| **Low-level access**               | `NativePasskey` HybridObject exported directly for callers who want to skip the better-auth wrapper.                                                                       |

---

## iOS Demo

<table>
  <tr>
    <th align="center">Registering Passkeys</th>
    <th align="center">Signing with Passkeys</th>
  </tr>
  <tr>
    <td align="center">
      <img alt="normal-mode" src="https://github.com/user-attachments/assets/c2dbbbf6-d3b6-48ee-8330-e7a790a7700d" height="650" width="300"/>
    </td>
    <td align="center">
      <img alt="skeleton-mode" src="https://github.com/user-attachments/assets/261aad9d-65ab-4f41-b214-9dfb61c61f37" height="650" width="300"/>
    </td>
  </tr>
</table>

## Android Demo

<table>
  <tr>
    <th align="center">Registering Passkeys</th>
    <th align="center">Signing with Passkeys</th>
  </tr>
  <tr>
    <td align="center">
      <img alt="normal-mode" src="https://github.com/user-attachments/assets/152bcf88-4efa-44d9-8165-8e5e041db4bf" height="650" width="300"/>
    </td>
    <td align="center">
      <img alt="skeleton-mode" src="https://github.com/user-attachments/assets/efb7dec2-1e42-414a-9a05-d47a25d307f6" height="650" width="300"/>
    </td>
  </tr>
</table>

---

## 🔧 Setup

### No Model File, No Extra SDK

Unlike libraries that ship a WebAuthn implementation in JS, this library **delegates entirely to the OS**:

- **iOS:** `AuthenticationServices` is a system framework — already on every iPhone running iOS 15.1+.
- **Android:** `CredentialManager` is a Jetpack library backed by Google Play Services — passkey storage and sync are managed by the OS.

### Server — better-auth passkey plugin

Configure `better-auth` with the `passkey` plugin as normal. Make sure `rpID`, `rpName`, and `origin` match the public domain your app will use, and add every Android signing SHA-256 as an `android:apk-key-hash:<BASE64URL_SHA256>` entry in `origin`.

```ts
import { betterAuth } from 'better-auth';
import { passkey } from '@better-auth/passkey';

export const auth = betterAuth({
  plugins: [
    passkey({
      rpID: 'auth.example.com',
      rpName: 'My App',
      origin: [
        'https://auth.example.com',
        'android:apk-key-hash:AbCdEf...', // Play signing cert
        'android:apk-key-hash:XyZ123...', // Upload/debug cert
      ],
    }),
  ],
});
```

> [!IMPORTANT]
> **`origin` must be an array on Android**, and it must include an `android:apk-key-hash:` entry for **every signing certificate** your app is built with (debug keystore, upload key, and Play App Signing key are usually three different SHAs).
>
> The WebAuthn ceremony's `clientDataJSON.origin` on Android is `android:apk-key-hash:<hash>`, **not** `https://your-domain`. If your configured `origin` is only the HTTPS URL, the server will reject the attestation and the user sees a generic `rpId cannot be validated` error on-device — which is misleading, because the real failure is an **origin mismatch**, not an rpId problem.

#### Computing the `apk-key-hash` values

The hash is the **SHA-256 of the certificate bytes**, base64url-encoded **without padding** — _not_ the colon-hex fingerprint you see in `keytool` or Play Console.

Convert every fingerprint from your `assetlinks.json` with this script. Save as `apk-key-hash.mjs`:

```js
const fingerprints = {
  'Play signing cert': 'FA:C6:17:45:DC:09:...:9C',
  'Upload/debug cert': 'C4:F7:A8:C2:CE:C8:...:51',
};

for (const [label, fp] of Object.entries(fingerprints)) {
  const bytes = Buffer.from(fp.replace(/:/g, ''), 'hex');
  const hash = bytes.toString('base64url'); // Node 16+
  console.log(`${label}:`);
  console.log(`  android:apk-key-hash:${hash}\n`);
}
```

Run with `node apk-key-hash.mjs` and drop each output line into your `origin` array.

If you're on Node < 16, replace the `base64url` call with:

```js
bytes
  .toString('base64')
  .replace(/\+/g, '-')
  .replace(/\//g, '_')
  .replace(/=+$/, '');
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

   - No file extension. Serve as `application/json`.
   - `<TEAMID>` is your Apple developer team ID; the bundle identifier must match your release build.

### Android — Digital Asset Links

Android verifies passkey requests through a chain: **installed app → assetlinks.json on your RP domain → Play Services verifier → Credential Manager**. Any broken link and the on-device error is the misleading `rpId cannot be validated`.

#### 1. Collect every SHA-256 fingerprint your app is signed with

You almost always have **more than one**:

```bash
# Debug keystore (emulator + local device installs)
keytool -list -v -keystore ~/.android/debug.keystore \
  -alias androiddebugkey -storepass android -keypass android

# Upload key (what you sign the AAB with before uploading to Play)
keytool -list -v -keystore path/to/upload-keystore.jks -alias upload

# Play App Signing key (what Play re-signs your AAB with for end users)
# Get from: Play Console → Setup → App integrity → App signing key certificate → SHA-256
```

If your app is installed via Play internal-test / production, the running binary is signed with the **Play App Signing key**, not your upload key. Miss this and passkey works locally but fails in Play builds.

#### 2. Host `https://<rpID>/.well-known/assetlinks.json`

Put **all** fingerprints inside a **single statement object**:

```json
[
  {
    "relation": [
      "delegate_permission/common.handle_all_urls",
      "delegate_permission/common.get_login_creds"
    ],
    "target": {
      "namespace": "android_app",
      "package_name": "com.example.myapp",
      "sha256_cert_fingerprints": [
        "FA:C6:17:45:DC:09:...:9C",
        "C4:F7:A8:C2:CE:C8:...:51"
      ]
    }
  }
]
```

Include the `common.get_login_creds` relation — Credential Manager requires it for passkey flows. `common.handle_all_urls` alone is not enough.

> [!WARNING]
> **Do not add extra statement objects with empty `sha256_cert_fingerprints: []` arrays.** Google's Digital Asset Links verifier fails the _entire file_ with `ERROR_CODE_MALFORMED_CONTENT` if any statement has an empty fingerprint list — even if other statements are valid. Symptom: passkey fails everywhere with `rpId cannot be validated`, but your file "looks fine" to a human reader. Keep the file to exactly one statement per relation set.

The file must be served:

- Over **HTTPS** on the exact host that matches your `rpID`
- With `Content-Type: application/json`
- With **no redirects** (302 to `www.` will fail verification)
- Publicly reachable — no auth wall, no IP allowlist

#### 3. Verify the file is accepted by Google

```bash
curl -i https://<rpID>/.well-known/assetlinks.json
```

Then check what Google's verifier sees:

```
https://digitalassetlinks.googleapis.com/v1/statements:list?source.web.site=https://<rpID>&relation=delegate_permission/common.get_login_creds
```

You want:

- `statements[]` containing every fingerprint you listed
- `debugString` **empty**
- No `errorCode`

If `debugString` is non-empty, fix the file before doing anything else. Nothing downstream will work until this is clean.

#### 4. Match `rpID` exactly

The `rpID` on the server and in every native call must be exactly the host — no scheme, no trailing dot, no `www.`:

- ✅ `gauthamvijay.com`
- ❌ `https://gauthamvijay.com`
- ❌ `gauthamvijay.com.`
- ❌ `www.gauthamvijay.com` (unless assetlinks is also served from `www.`)

#### 5. Force re-verification after changing anything

Android caches the assetlinks verification result **at install time**. Editing the file on your server does not re-trigger verification on an already-installed app. After changes:

```bash
adb uninstall com.example.myapp
# then reinstall
```

Then confirm the verifier's per-domain status on-device:

```bash
adb shell pm get-app-links com.example.myapp
```

You want the domain listed as `verified`. Anything else (`legacy_failure`, `1024`, etc.) means Android could not reach or parse your assetlinks file at install time.

Also purge your CDN cache for `/.well-known/assetlinks.json` — Cloudflare, CloudFront, Vercel, and Netlify all cache this path aggressively, and Google's verifier itself caches for ~10 minutes (`maxAge` in the response).

#### 6. Optional (API 34+): forward the HTTPS origin

Request `android.permission.CREDENTIAL_MANAGER_SET_ORIGIN` in your `AndroidManifest.xml` to forward your app's HTTPS origin to Credential Manager. Without it, the module falls back to the `apk-key-hash` origin — which is why you must list those hashes in your server's `origin` array (see the server section above). You can skip this permission entirely if your server's `origin` includes the `apk-key-hash` entries.

---

## ⚙️ Usage

### Basic — Drop-in better-auth client

```tsx
import { createAuthClient } from 'better-auth/react';
import { betterAuthPasskeyClient } from 'react-native-nitro-better-auth-passkey';

export const authClient = createAuthClient({
  baseURL: 'https://api.example.com',
  plugins: [betterAuthPasskeyClient()],
});

// Register a new passkey
await authClient.passkey.addPasskey({ name: 'My iPhone' });

// Sign in with an existing passkey
await authClient.signIn.passkey();
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
import { NativePasskey } from 'react-native-nitro-better-auth-passkey';

const registration = await NativePasskey.register({
  optionsJSON: JSON.stringify(publicKeyCredentialCreationOptionsJSON),
  useAutoRegister: false,
});
// → { id, rawId, type, clientDataJSON, attestationObject, transports, authenticatorAttachment }

const assertion = await NativePasskey.authenticate({
  optionsJSON: JSON.stringify(publicKeyCredentialRequestOptionsJSON),
  useAutofill: false,
});
// → { id, rawId, type, clientDataJSON, authenticatorData, signature, userHandle?, authenticatorAttachment }
```

All binary fields (`rawId`, `clientDataJSON`, `attestationObject`, `authenticatorData`, `signature`, `userHandle`) are **base64url-encoded strings** matching the `RegistrationResponseJSON` / `AuthenticationResponseJSON` shapes from the WebAuthn Level 3 JSON encoding. The types are re-exported from this package — no extra dependency needed.

---

## 🚦 Error Handling

Native cancellation and failures reject with an `Error`. The better-auth plugin wraps them:

```ts
const res = await authClient.signIn.passkey();
if (res.error) {
  if (res.error.statusText === 'AUTH_CANCELLED') {
    // User dismissed the sheet, or the OS rejected the request
    // (no matching passkey, associated-domain mismatch, biometric unavailable, etc.)
  }
}
```

The native error's `message` is preserved in `res.error.message`. On iOS it's the `NSError.localizedDescription`; on Android it's the `CreateCredentialException` / `GetCredentialException` message.

---

## 🩺 Troubleshooting — Android

The on-device error `rpId cannot be validated` is a catch-all. It surfaces for **at least four unrelated root causes**, and the fix depends on which one you're hitting. Work through these in order.

### 1. `assetlinks.json` is malformed or unreachable

Check Google's verifier directly:

```
https://digitalassetlinks.googleapis.com/v1/statements:list?source.web.site=https://<rpID>&relation=delegate_permission/common.get_login_creds
```

**`ERROR_CODE_MALFORMED_CONTENT`** with `Could not parse statement list (must contain at least one certificate): []` — you have a statement object with an empty `sha256_cert_fingerprints: []` array. Delete the empty statements. One malformed statement kills the whole file.

**`ERROR_CODE_FETCH_ERROR`** — the file isn't reachable. Check redirects (`curl -I` — you want `200`, not `301`/`302`), Content-Type, and that the host in the URL exactly matches your `rpID`.

**Empty `statements` array with no errors** — the file parsed but doesn't include the `get_login_creds` relation. Add it.

### 2. Wrong SHA-256 for the running build

The fingerprint in `assetlinks.json` must match the certificate the **installed APK** is signed with, not necessarily your upload key:

- Local debug builds → `~/.android/debug.keystore` SHA
- Play internal test / production → **Play App Signing** SHA (from Play Console)
- Sideloaded release APK → your upload key SHA

Include all three in `sha256_cert_fingerprints`. If only Play builds fail but debug works, you forgot the Play App Signing SHA.

### 3. Origin mismatch on the server

If assetlinks verifies clean but sign-in still fails, the server is rejecting the WebAuthn ceremony because Android sent `origin: "android:apk-key-hash:..."` and your better-auth `origin` config only lists the HTTPS URL.

Fix: pass `origin` as an array containing the HTTPS URL **and** an `android:apk-key-hash:<hash>` for every signing cert. See the [server setup](#server--better-auth-passkey-plugin) section for the conversion script.

Server logs will show `origin mismatch` or `attestation verification failed` — check them. The on-device error will still just say `rpId cannot be validated`.

### 4. Cached verification result on the device

Android verifies assetlinks **at install time** and caches the result. Editing the file after install does nothing until you reinstall:

```bash
adb uninstall com.example.myapp
# reinstall
adb shell pm get-app-links com.example.myapp
```

The domain should show `verified`. If it shows `legacy_failure` or `1024`, verification failed at install — go back to step 1.

Google's verifier also caches for ~10 minutes (`maxAge: 599s` in the response). And your CDN caches `.well-known/*` aggressively. After fixing the file: purge CDN → wait 10 minutes → reinstall app.

### Quick decision tree

```
rpId cannot be validated
├─ digitalassetlinks.googleapis.com verifier
│  ├─ has errorCode        → fix assetlinks.json (step 1)
│  ├─ statements empty     → add get_login_creds relation
│  └─ statements OK        → continue ↓
├─ adb shell pm get-app-links
│  ├─ not "verified"       → uninstall + reinstall (step 4)
│  └─ "verified"           → continue ↓
├─ server logs on /passkey/*
│  ├─ "origin mismatch"    → add apk-key-hash to origin (step 3)
│  └─ silent               → check SHA matches running build (step 2)
```

---

## 🏗️ Architecture — Native-Only vs Web-Compatible

|                     | This library                                      | Typical WebAuthn RN libraries               |
| ------------------- | ------------------------------------------------- | ------------------------------------------- |
| **iOS**             | `ASAuthorizationController` (built-in)            | JS WebAuthn polyfill or `expo-*` wrappers   |
| **Android**         | Jetpack `CredentialManager` (Play Services)       | Custom FIDO2 client, deprecated `Fido` APIs |
| **Web fallback**    | None — use `@better-auth/passkey/client` directly | Bundled `@simplewebauthn/browser`           |
| **Bridge**          | Nitro (statically compiled JSI)                   | Old React Native bridge or TurboModules     |
| **Target**          | better-auth only                                  | Multi-server, generic WebAuthn              |
| **App size impact** | ~150 KB                                           | 1-3 MB (SDK + polyfills)                    |

Deliberately narrow scope: this package exists to make better-auth passkeys work well on React Native. Anything outside that is out of scope.

---

## 🧩 Supported Platforms

| Platform             | Status           | Notes                                                                            |
| -------------------- | ---------------- | -------------------------------------------------------------------------------- |
| **iOS**              | ✅ Supported     | Physical device, iOS 15.1+                                                       |
| **Android**          | ✅ Supported     | API 28+, Play Services 23.30+                                                    |
| **macOS**            | ⚠️ Best-effort   | Same native code path as iOS via AuthenticationServices; needs community testing |
| **Web**              | ❌ Not supported | Use stock `@better-auth/passkey/client` on web                                   |
| **iOS Simulator**    | ❌ Not supported | Passkey UI unavailable in simulator                                              |
| **Android Emulator** | ❌ Not supported | Requires Play Services + biometrics                                              |

---

## 📊 App Size Impact

| Component                                   | Size                                          |
| ------------------------------------------- | --------------------------------------------- |
| Nitro module code (Swift + Kotlin)          | ~150 KB                                       |
| `AuthenticationServices` (iOS, built-in)    | ~0 KB (system framework)                      |
| `androidx.credentials` + play-services-auth | ~500 KB (shared with other libs on most apps) |
| **Total new addition**                      | **~150 KB (iOS)** / **~650 KB (Android)**     |

---

## 🛡️ Safety Notes

| Feature                      | Description                                                                                                                                        |
| ---------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Server-driven challenges** | Every `optionsJSON` comes from better-auth's `/generate-*-options` endpoint — never constructed on the client.                                     |
| **Origin binding**           | On Android, the module forwards `https://<rpId>` as the request origin when `SET_ORIGIN` is granted, so the credential is bound to the correct RP. |
| **Delegate retention**       | iOS holds a strong reference to the `ASAuthorizationController` delegate for the lifetime of the request — cancellation races don't leak or crash. |
| **No plaintext credentials** | Only base64url-encoded WebAuthn payloads cross the JS bridge. Private key material stays in the Secure Enclave / Android Keystore.                 |
| **User-visible sheet**       | Every operation triggers the OS-controlled system sheet. The library cannot silently authenticate.                                                 |

---

## 🤝 Contributing

PRs welcome — especially for macOS validation and additional authenticator preferences.

- [Development Workflow](CONTRIBUTING.md#development-workflow)
- [Sending a PR](CONTRIBUTING.md#sending-a-pull-request)
- [Code of Conduct](CODE_OF_CONDUCT.md)

---

## 🪪 License

MIT © [**Gautham Vijayan**](https://gauthamvijay.com)

---

Made with ❤️ and [**Nitro Modules**](https://nitro.margelo.com) + [**better-auth**](https://better-auth.com) + [**AuthenticationServices**](https://developer.apple.com/documentation/authenticationservices) + [**Credential Manager**](https://developer.android.com/training/sign-in/passkeys)
