import * as SecureStore from 'expo-secure-store';

/**
 * Persistence for the refresh token.
 *
 * The access token stays in memory only; the refresh token is the long-lived
 * credential and belongs in the OS keychain/keystore, not in AsyncStorage or a
 * plain file. Keeping it here also means a native restart can restore the
 * session without asking the user to sign in again.
 */
const REFRESH_TOKEN_KEY = 'smartschool.refresh_token';

export async function getStoredRefreshToken(): Promise<string | null> {
  try {
    return await SecureStore.getItemAsync(REFRESH_TOKEN_KEY);
  } catch {
    // A denied/unavailable keystore must not crash the app; the user simply
    // has to sign in again.
    return null;
  }
}

export async function setStoredRefreshToken(token: string | null): Promise<void> {
  try {
    if (token) {
      await SecureStore.setItemAsync(REFRESH_TOKEN_KEY, token);
    } else {
      await SecureStore.deleteItemAsync(REFRESH_TOKEN_KEY);
    }
  } catch {
    // Best effort: a failure to persist only affects session restore.
  }
}
