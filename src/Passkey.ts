import { NitroModules } from 'react-native-nitro-modules';

import type { Passkey } from './Passkey.nitro';

/**
 * Native passkey bridge. Prefer using {@link betterAuthPasskeyClient}
 * from the package root — this is the low-level primitive it wraps.
 */
export const NativePasskey =
  NitroModules.createHybridObject<Passkey>('Passkey');
