import { Platform } from 'react-native';
import * as SecureStore from 'expo-secure-store';

// ── Platform-aware storage ────────────────────────────────────────────────
// SecureStore only works on iOS/Android. On web we fall back to localStorage.

const webStore = {
    setItem: (key: string, value: string) => {
        try { localStorage.setItem(key, value); } catch { /* SSR / no localStorage */ }
    },
    getItem: (key: string): string | null => {
        try { return localStorage.getItem(key); } catch { return null; }
    },
    removeItem: (key: string) => {
        try { localStorage.removeItem(key); } catch { /* ignore */ }
    },
};

async function set(key: string, value: string) {
    if (Platform.OS === 'web') {
        webStore.setItem(key, value);
    } else {
        await SecureStore.setItemAsync(key, value);
    }
}

async function get(key: string): Promise<string | null> {
    if (Platform.OS === 'web') {
        return webStore.getItem(key);
    }
    return SecureStore.getItemAsync(key);
}

async function remove(key: string): Promise<void> {
    if (Platform.OS === 'web') {
        webStore.removeItem(key);
    } else {
        await SecureStore.deleteItemAsync(key);
    }
}

// ── Public API ────────────────────────────────────────────────────────────

export const saveToken = (token: string) => set('adminAccessToken', token);
export const getToken  = ()               => get('adminAccessToken');
export const removeToken = ()             => remove('adminAccessToken');

export const saveRefreshToken = (token: string) => set('adminRefreshToken', token);
export const getRefreshToken  = ()               => get('adminRefreshToken');
export const removeRefreshToken = ()             => remove('adminRefreshToken');

export const saveUser = (user: any)  => set('adminUser', JSON.stringify(user));
export const getUser  = async (): Promise<any | null> => {
    const str = await get('adminUser');
    return str ? JSON.parse(str) : null;
};
export const removeUser = () => remove('adminUser');
