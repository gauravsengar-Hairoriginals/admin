import * as SecureStore from 'expo-secure-store';

export const saveToken = async (token: string) => {
    await SecureStore.setItemAsync('adminAccessToken', token);
};

export const getToken = async (): Promise<string | null> => {
    return await SecureStore.getItemAsync('adminAccessToken');
};

export const removeToken = async () => {
    await SecureStore.deleteItemAsync('adminAccessToken');
};

export const saveUser = async (user: any) => {
    // On native, you might want to store user in AsyncStorage or SecureStore
    // For simplicity, we'll strip it here or store stringified
    await SecureStore.setItemAsync('adminUser', JSON.stringify(user));
};

export const getUser = async (): Promise<any | null> => {
    const userStr = await SecureStore.getItemAsync('adminUser');
    return userStr ? JSON.parse(userStr) : null;
};

export const removeUser = async () => {
    await SecureStore.deleteItemAsync('adminUser');
};
