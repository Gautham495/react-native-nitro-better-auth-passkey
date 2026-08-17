package com.margelo.nitro.nitrobetterauthpasskey

import android.os.Build
import androidx.credentials.CreatePublicKeyCredentialRequest
import androidx.credentials.GetCredentialRequest
import androidx.credentials.GetPublicKeyCredentialOption

internal fun buildCreateRequest(
  optionsJson: String,
  origin: String?,
  preferImmediatelyAvailable: Boolean,
  autoSelectAllowed: Boolean,
): CreatePublicKeyCredentialRequest {
  return try {
    CreatePublicKeyCredentialRequest(
      optionsJson,
      null,
      preferImmediatelyAvailable,
      origin,
      autoSelectAllowed,
    )
  } catch (_: SecurityException) {
    // Missing CREDENTIAL_MANAGER_SET_ORIGIN — fall back to default origin.
    CreatePublicKeyCredentialRequest(
      optionsJson,
      null,
      preferImmediatelyAvailable,
      null,
      autoSelectAllowed,
    )
  }
}

internal fun buildGetRequest(
  option: GetPublicKeyCredentialOption,
  origin: String?,
  preferImmediatelyAvailable: Boolean,
): GetCredentialRequest {
  val builder = GetCredentialRequest.Builder().addCredentialOption(option)
  if (preferImmediatelyAvailable) {
    builder.setPreferImmediatelyAvailableCredentials(true)
  }
  if (origin != null && Build.VERSION.SDK_INT >= Build.VERSION_CODES.UPSIDE_DOWN_CAKE) {
    try {
      builder.setOrigin(origin)
    } catch (_: SecurityException) {
      // Apps without SET_ORIGIN fall back to the default origin.
    }
  }
  return builder.build()
}
