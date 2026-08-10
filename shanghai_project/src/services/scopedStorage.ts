import AsyncStorage from '@react-native-async-storage/async-storage';

const ACTIVE_USER_KEY = 'user:profile';

export const USER_SCOPED_BASE_KEYS = [
  'user:bodyData',
  'user:goal',
  'user:bodyHistory',
  'recipe:saved',
  'recipe:history',
  'recipe:inspirations:saved',
  'workout:saved',
  'workout:history',
  'ingredient:history',
  'fasting:state',
] as const;

async function activeUserId(): Promise<string> {
  const raw = await AsyncStorage.getItem(ACTIVE_USER_KEY);
  if (!raw) return 'guest';
  try {
    const user = JSON.parse(raw) as { id?: string };
    return user.id ? String(user.id) : 'guest';
  } catch {
    return 'guest';
  }
}

export async function scopedKey(baseKey: string): Promise<string> {
  return `${baseKey}:${await activeUserId()}`;
}

/** Read the current user's value and migrate the old unscoped value once. */
export async function getScopedItem(baseKey: string): Promise<string | null> {
  const key = await scopedKey(baseKey);
  const scoped = await AsyncStorage.getItem(key);
  if (scoped !== null) return scoped;

  const legacy = await AsyncStorage.getItem(baseKey);
  if (legacy !== null) {
    await AsyncStorage.setItem(key, legacy);
    await AsyncStorage.removeItem(baseKey);
  }
  return legacy;
}

export async function setScopedItem(baseKey: string, value: string): Promise<void> {
  await AsyncStorage.setItem(await scopedKey(baseKey), value);
}

export async function removeCurrentUserScopedData(): Promise<void> {
  const keys = await Promise.all(USER_SCOPED_BASE_KEYS.map(scopedKey));
  await AsyncStorage.multiRemove([...keys, ...USER_SCOPED_BASE_KEYS]);
}
