package com.margelo.nitro.nitrobetterauthpasskey

import org.json.JSONObject

internal fun RegistrationResponse.Companion.fromJson(
  json: JSONObject,
  fallbackAttachment: String?,
): RegistrationResponse {
  val response = json.getJSONObject("response")
  val transportsArr = response.optJSONArray("transports")
  val transports: Array<String> = if (transportsArr != null) {
    Array(transportsArr.length()) { i -> transportsArr.getString(i) }
  } else {
    arrayOf("internal")
  }
  val attachment = json.optString("authenticatorAttachment")
    .ifEmpty { fallbackAttachment.orEmpty() }
    .ifEmpty { null }

  return RegistrationResponse(
    id = json.getString("id"),
    rawId = json.getString("rawId"),
    type = json.optString("type").ifEmpty { "public-key" },
    clientDataJSON = response.getString("clientDataJSON"),
    attestationObject = response.getString("attestationObject"),
    transports = transports,
    authenticatorAttachment = attachment,
  )
}
