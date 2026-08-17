import { useEffect, useState } from 'react';
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';

import { authClient } from './auth-client';

/**
 * Example app for `react-native-nitro-better-auth-passkey`.
 *
 * Flow:
 *   1. Sign up with email + password (needed once, so the server has a user
 *      to attach a passkey to).
 *   2. Register a passkey on this device — triggers the OS passkey sheet.
 *   3. Sign out.
 *   4. Sign back in with the passkey — no password needed.
 *
 * The whole file uses better-auth's stock client API. The only line that
 * makes it native is the plugin registered in `./auth-client.ts`.
 */
export default function App() {
  const { data: session, isPending, refetch } = authClient.useSession();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [busy, setBusy] = useState<null | string>(null);
  const [log, setLog] = useState<string[]>([]);

  const append = (msg: string) => {
    console.log(msg);
    setLog((prev) =>
      [`${new Date().toLocaleTimeString()}  ${msg}`, ...prev].slice(0, 20)
    );
  };

  useEffect(() => {
    const userEmail = session?.user?.email;
    if (userEmail) {
      append(`Session active: ${userEmail}`);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session?.user?.email]);

  const withBusy = async (label: string, fn: () => Promise<void>) => {
    if (busy) return;
    setBusy(label);
    try {
      await fn();
    } catch (e) {
      append(`Unexpected error in ${label}: ${(e as Error)?.message ?? e}`);
    } finally {
      setBusy(null);
    }
  };

  // ---- Email sign up -------------------------------------------------------

  const signUp = () =>
    withBusy('Sign up', async () => {
      if (!email || !password) {
        Alert.alert(
          'Missing fields',
          'Email and password are required to sign up.'
        );
        return;
      }
      const res = await authClient.signUp.email({
        email,
        password,
        name: name,
      });
      if (res.error) {
        append(`Sign up failed: ${res.error.message}`);
        Alert.alert('Sign up failed', res.error.message ?? 'Unknown error');
        return;
      }
      append('Signed up.');
      await refetch();
    });

  const signInEmail = () =>
    withBusy('Sign in (email)', async () => {
      const res = await authClient.signIn.email({ email, password });
      if (res.error) {
        append(`Email sign-in failed: ${res.error.message}`);
        Alert.alert('Sign in failed', res.error.message ?? 'Unknown error');
        return;
      }
      append('Signed in with password.');
      await refetch();
    });

  // ---- Passkey -------------------------------------------------------------

  const registerPasskey = () =>
    withBusy('Register passkey', async () => {
      const passkeyName = deviceName();
      append(`Requesting passkey registration as "${passkeyName}"…`);
      const res = await authClient.passkey.addPasskey({
        name: passkeyName,
        authenticatorAttachment: 'platform',
      });
      if (res.error) {
        if (res.error.statusText === 'AUTH_CANCELLED') {
          append('Passkey registration cancelled.');
        } else {
          append(`Passkey registration failed: ${res.error.message}`);
          Alert.alert(
            'Passkey registration failed',
            res.error.message ?? 'Unknown error'
          );
        }
        return;
      }
      append('Passkey registered ✅');
    });

  const signInWithPasskey = () =>
    withBusy('Sign in (passkey)', async () => {
      append('Requesting passkey assertion…');
      const res = await authClient.signIn.passkey();
      if (res.error) {
        if (res.error.statusText === 'AUTH_CANCELLED') {
          append('Passkey sign-in cancelled.');
        } else {
          append(`Passkey sign-in failed: ${res.error.message}`);
          Alert.alert(
            'Passkey sign-in failed',
            res.error.message ?? 'Unknown error'
          );
        }
        return;
      }
      append('Signed in with passkey ✅');
      await refetch();
    });

  // ---- Sign out ------------------------------------------------------------

  const signOut = () =>
    withBusy('Sign out', async () => {
      await authClient.signOut();
      append('Signed out.');
      await refetch();
    });

  // ---- Render --------------------------------------------------------------

  if (isPending) {
    return (
      <View style={styles.root}>
        <Text style={styles.title}>Loading session…</Text>
      </View>
    );
  }

  return (
    <View style={styles.root}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.flex}
      >
        <ScrollView
          contentContainerStyle={styles.container}
          keyboardShouldPersistTaps="handled"
        >
          <Text style={styles.title}>Nitro Passkey · better-auth</Text>

          {session?.user ? (
            <View style={styles.card}>
              <Text style={styles.cardTitle}>Signed in</Text>
              <Text style={styles.mono}>{session.user.email}</Text>
              {session.user.name ? (
                <Text style={styles.mono}>{session.user.name}</Text>
              ) : null}

              <Pressable
                style={({ pressed }) => [
                  styles.button,
                  pressed && styles.buttonPressed,
                ]}
                onPress={registerPasskey}
                disabled={busy !== null}
              >
                <Text style={styles.buttonText}>
                  {busy === 'Register passkey'
                    ? '…'
                    : 'Register passkey on this device'}
                </Text>
              </Pressable>

              <Pressable
                style={({ pressed }) => [
                  styles.button,
                  styles.secondary,
                  pressed && styles.buttonPressed,
                ]}
                onPress={signOut}
                disabled={busy !== null}
              >
                <Text style={[styles.buttonText, styles.secondaryText]}>
                  {busy === 'Sign out' ? '…' : 'Sign out'}
                </Text>
              </Pressable>
            </View>
          ) : (
            <View style={styles.card}>
              <Text style={styles.cardTitle}>Sign in</Text>

              <TextInput
                style={styles.input}
                placeholder="Email"
                placeholderTextColor="#8a8a8a"
                autoCapitalize="none"
                autoCorrect={false}
                keyboardType="email-address"
                textContentType="username"
                value={email}
                onChangeText={setEmail}
                editable={busy === null}
              />
              <TextInput
                style={styles.input}
                placeholder="Password"
                placeholderTextColor="#8a8a8a"
                secureTextEntry
                textContentType="password"
                value={password}
                onChangeText={setPassword}
                editable={busy === null}
              />
              <TextInput
                style={styles.input}
                placeholder="Name (only used for sign up)"
                placeholderTextColor="#8a8a8a"
                autoCapitalize="words"
                value={name}
                onChangeText={setName}
                editable={busy === null}
              />

              <Pressable
                style={({ pressed }) => [
                  styles.button,
                  pressed && styles.buttonPressed,
                ]}
                onPress={signInWithPasskey}
                disabled={busy !== null}
              >
                <Text style={styles.buttonText}>
                  {busy === 'Sign in (passkey)' ? '…' : 'Sign in with passkey'}
                </Text>
              </Pressable>

              <View style={styles.divider}>
                <View style={styles.dividerLine} />
                <Text style={styles.dividerLabel}>or use email</Text>
                <View style={styles.dividerLine} />
              </View>

              <Pressable
                style={({ pressed }) => [
                  styles.button,
                  styles.secondary,
                  pressed && styles.buttonPressed,
                ]}
                onPress={signInEmail}
                disabled={busy !== null}
              >
                <Text style={[styles.buttonText, styles.secondaryText]}>
                  {busy === 'Sign in (email)' ? '…' : 'Sign in with email'}
                </Text>
              </Pressable>

              <Pressable
                style={({ pressed }) => [
                  styles.button,
                  styles.ghost,
                  pressed && styles.buttonPressed,
                ]}
                onPress={signUp}
                disabled={busy !== null}
              >
                <Text style={[styles.buttonText, styles.ghostText]}>
                  {busy === 'Sign up' ? '…' : 'Create account'}
                </Text>
              </Pressable>
            </View>
          )}

          <View style={styles.logCard}>
            <Text style={styles.cardTitle}>Log</Text>
            {log.length === 0 ? (
              <Text style={styles.dim}>Nothing yet.</Text>
            ) : (
              log.map((line, i) => (
                <Text key={i} style={styles.logLine}>
                  {line}
                </Text>
              ))
            )}
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

const deviceName = (): string => {
  const os = Platform.OS === 'ios' ? 'iPhone' : 'Android';
  const stamp = new Date().toISOString().slice(0, 10);
  return `${os} passkey (${stamp})`;
};

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: '#0f1115',
    paddingTop: 20,
  },
  flex: { flex: 1 },
  container: {
    padding: 20,
    gap: 16,
    paddingBottom: 40,
  },
  title: {
    fontSize: 22,
    fontWeight: '600',
    color: '#ffffff',
    marginBottom: 4,
  },
  card: {
    backgroundColor: '#1a1d24',
    borderRadius: 16,
    padding: 20,
    gap: 12,
    borderWidth: 1,
    borderColor: '#242833',
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#e4e6eb',
    marginBottom: 4,
  },
  input: {
    backgroundColor: '#0f1115',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#2a2e39',
    paddingHorizontal: 14,
    paddingVertical: 12,
    color: '#ffffff',
    fontSize: 15,
  },
  button: {
    backgroundColor: '#4c8dff',
    borderRadius: 10,
    paddingVertical: 14,
    alignItems: 'center',
  },
  buttonPressed: {
    opacity: 0.7,
  },
  buttonText: {
    color: '#ffffff',
    fontSize: 15,
    fontWeight: '600',
  },
  secondary: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: '#4c8dff',
  },
  secondaryText: {
    color: '#4c8dff',
  },
  ghost: {
    backgroundColor: 'transparent',
  },
  ghostText: {
    color: '#8a8a8a',
    fontWeight: '500',
  },
  divider: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginVertical: 4,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: '#2a2e39',
  },
  dividerLabel: {
    color: '#6c7280',
    fontSize: 12,
  },
  mono: {
    color: '#e4e6eb',
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
    fontSize: 13,
  },
  logCard: {
    backgroundColor: '#1a1d24',
    borderRadius: 16,
    padding: 20,
    gap: 4,
    borderWidth: 1,
    borderColor: '#242833',
  },
  logLine: {
    color: '#c0c4cc',
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
    fontSize: 11,
  },
  dim: {
    color: '#6c7280',
    fontSize: 13,
  },
});
