import { NitroModules } from 'react-native-nitro-modules';
import type { NitroBetterAuthPasskey } from './NitroBetterAuthPasskey.nitro';

const NitroBetterAuthPasskeyHybridObject =
  NitroModules.createHybridObject<NitroBetterAuthPasskey>('NitroBetterAuthPasskey');

export function multiply(a: number, b: number): number {
  return NitroBetterAuthPasskeyHybridObject.multiply(a, b);
}
