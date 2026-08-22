import { createClient } from '@supabase/supabase-js';
import * as SecureStore from 'expo-secure-store';

const url = process.env.EXPO_PUBLIC_SUPABASE_URL;
const publishableKey = process.env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

// ビルド時に値が注入されなかった場合、`$VAR` のような未展開の文字列が
// そのまま入ることがある。truthy チェックだけでは素通りし、createClient が
// バンドル評価中に throw して起動直後にクラッシュするため、形式まで検証する。
const isUnresolved = (v) => typeof v === 'string' && v.startsWith('$');

if (!url || !publishableKey) {
  throw new Error('Missing EXPO_PUBLIC_SUPABASE_URL or EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY');
}

if (isUnresolved(url) || isUnresolved(publishableKey)) {
  throw new Error(
    'Unresolved env placeholder for EXPO_PUBLIC_SUPABASE_URL / EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY. ' +
    'EAS does not interpolate "$VAR" in eas.json — register the variable in the EAS environment instead.',
  );
}

if (!/^https?:\/\//.test(url)) {
  throw new Error(`Invalid EXPO_PUBLIC_SUPABASE_URL: expected an http(s) URL, got "${url}"`);
}

const secureStoreAdapter = {
  getItem: (key) => SecureStore.getItemAsync(key),
  setItem: (key, value) => SecureStore.setItemAsync(key, value),
  removeItem: (key) => SecureStore.deleteItemAsync(key),
};

export const supabase = createClient(url, publishableKey, {
  auth: {
    storage: secureStoreAdapter,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});
