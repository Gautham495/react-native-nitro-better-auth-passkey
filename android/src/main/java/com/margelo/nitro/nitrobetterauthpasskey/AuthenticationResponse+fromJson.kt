package com.margelo.nitro.nitrobetterauthpasskey

import org.json.JSONObject

internal fun AuthenticationResponse.Companion.fromJson(
  json: JSONObject,
  fallbackAttachment: String?,
): AuthenticationResponse {
  val response = json.getJSONObject("response")
  val userHandle = response.optString("userHandle").ifEmpty { null }
  val attachment = json.optString("authenticatorAttachment")
    .ifEmpty { fallbackAttachment.orEmpty() }
    .ifEmpty { null }

  return AuthenticationResponse(
    id = json.getString("id"),
    rawId = json.getString("rawId"),
    type = json.optString("type").ifEmpty { "public-key" },
    clientDataJSON = response.getString("clientDataJSON"),
    authenticatorData = response.getString("authenticatorData"),
    signature = response.getString("signature"),
    userHandle = userHandle,
    authenticatorAttachment = attachment,
  )
}
