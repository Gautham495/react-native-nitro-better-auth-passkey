package com.margelo.nitro.nitrobetterauthpasskey
  
import com.facebook.proguard.annotations.DoNotStrip

@DoNotStrip
class NitroBetterAuthPasskey : HybridNitroBetterAuthPasskeySpec() {
  override fun multiply(a: Double, b: Double): Double {
    return a * b
  }
}
