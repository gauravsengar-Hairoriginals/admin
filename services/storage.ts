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

export const saveRefreshToken = async (token: string) => {
    await SecureStore.setItemAsync('adminRefreshToken', token);
};

export const getRefreshToken = async (): Promise<string | null> => {
    return await SecureStore.getItemAsync('adminRefreshToken');
};

export const removeRefreshToken = async () => {
    await SecureStore.deleteItemAsync('adminRefreshToken');
};

export const saveUser = async (user: any) => {
    await SecureStore.setItemAsync('adminUser', JSON.stringify(user));
};

export const getUser = async (): Promise<any | null> => {
    const userStr = await SecureStore.getItemAsync('adminUser');
    return userStr ? JSON.parse(userStr) : null;
};

export const removeUser = async () => {
    await SecureStore.deleteItemAsync('adminUser');
};
