package com.margelo.nitro.nitrobetterauthpasskey

import android.app.Activity
import android.content.pm.PackageManager
import android.os.Build
import androidx.annotation.Keep
import androidx.core.content.ContextCompat
import androidx.credentials.CreatePublicKeyCredentialRequest
import androidx.credentials.CreatePublicKeyCredentialResponse
import androidx.credentials.CredentialManager
import androidx.credentials.GetCredentialRequest
import androidx.credentials.GetPublicKeyCredentialOption
import androidx.credentials.PublicKeyCredential
import androidx.credentials.exceptions.CreateCredentialCancellationException
import androidx.credentials.exceptions.CreateCredentialException
import androidx.credentials.exceptions.GetCredentialCancellationException
import androidx.credentials.exceptions.GetCredentialException
import com.facebook.proguard.annotations.DoNotStrip
import com.margelo.nitro.NitroModules
import com.margelo.nitro.core.Promise
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext
import org.json.JSONObject

@Keep
@DoNotStrip
class HybridPasskey : HybridPasskeySpec() {

  override fun createPasskey(input: RegisterPasskeyInput): Promise<RegistrationResponse> {
    val activity = requireActivity()
    val optionsJson = parseOptionsJson(input.optionsJSON)

    // Ensure the system dialog shows the passkey nickname (user.name) even
    // if the server's displayName is a static string.
    optionsJson.optJSONObject("user")?.let { userObject ->
      val nickname = userObject.optString("name")
      if (nickname.isNotEmpty()) {
        userObject.put("displayName", nickname)
      }
    }

    val rpId = optionsJson.optJSONObject("rp")?.optString("id").orEmpty()
    if (rpId.isBlank()) {
      throw IllegalArgumentException("rp.id is required in optionsJSON")
    }
    val optionsJsonString = optionsJson.toString()
    val useAutoRegister = input.useAutoRegister ?: false
    val origin = "https://$rpId"
    val originForRequest = origin.takeIf { canUseSetOrigin(activity) }

    return Promise.async {
      withContext(Dispatchers.Main) {
        try {
          val credentialManager = CredentialManager.create(activity)
          val request = buildCreateRequest(
            optionsJson = optionsJsonString,
            origin = originForRequest,
            preferImmediatelyAvailable = useAutoRegister,
            autoSelectAllowed = useAutoRegister,
          )
          val result = credentialManager.createCredential(activity, request)
          if (result !is CreatePublicKeyCredentialResponse) {
            throw IllegalStateException("Unexpected credential type from Credential Manager")
          }
          RegistrationResponse.fromJson(
            JSONObject(result.registrationResponseJson),
            fallbackAttachment = "platform"
          )
        } catch (e: CreateCredentialCancellationException) {
          throw RuntimeException("User cancelled", e)
        } catch (e: CreateCredentialException) {
          throw RuntimeException(e.message ?: "Failed to create passkey", e)
        }
      }
    }
  }

  override fun authenticate(input: AuthenticatePasskeyInput): Promise<AuthenticationResponse> {
    val activity = requireActivity()
    val optionsJson = parseOptionsJson(input.optionsJSON)

    val rpId = optionsJson.optString("rpId")
    if (rpId.isNullOrBlank()) {
      throw IllegalArgumentException("rpId is required in optionsJSON")
    }
    val optionsJsonString = optionsJson.toString()
    val useAutofill = input.useAutofill ?: false
    val origin = "https://$rpId"
    val originForRequest = origin.takeIf { canUseSetOrigin(activity) }

    return Promise.async {
      withContext(Dispatchers.Main) {
        try {
          val credentialManager = CredentialManager.create(activity)
          val option = GetPublicKeyCredentialOption(optionsJsonString)
          val request = buildGetRequest(
            option = option,
            origin = originForRequest,
            preferImmediatelyAvailable = useAutofill,
          )
          val result = credentialManager.getCredential(activity, request)
          val credential = result.credential
          if (credential !is PublicKeyCredential) {
            throw IllegalStateException("Unexpected credential type: ${credential.type}")
          }
          AuthenticationResponse.fromJson(
            JSONObject(credential.authenticationResponseJson),
            fallbackAttachment = "platform"
          )
        } catch (e: GetCredentialCancellationException) {
          throw RuntimeException("User cancelled", e)
        } catch (e: GetCredentialException) {
          throw RuntimeException(e.message ?: "Failed to get passkey", e)
        }
      }
    }
  }

  private fun requireActivity(): Activity {
    val ctx = NitroModules.applicationContext ?: throw Error("No ApplicationContext set!")
    return ctx.currentActivity ?: throw IllegalStateException("No current Activity available")
  }

  private fun parseOptionsJson(raw: String): JSONObject {
    return try {
      JSONObject(raw)
    } catch (e: Exception) {
      throw IllegalArgumentException("optionsJSON is not valid JSON", e)
    }
  }

  private fun canUseSetOrigin(activity: Activity): Boolean {
    if (Build.VERSION.SDK_INT < Build.VERSION_CODES.UPSIDE_DOWN_CAKE) return false
    val permission = "android.permission.CREDENTIAL_MANAGER_SET_ORIGIN"
    return ContextCompat.checkSelfPermission(activity, permission) == PackageManager.PERMISSION_GRANTED
  }
}