export const saveToken = async (token: string) => {
    localStorage.setItem('adminAccessToken', token);
};

export const getToken = async (): Promise<string | null> => {
    return localStorage.getItem('adminAccessToken');
};

export const removeToken = async () => {
    localStorage.removeItem('adminAccessToken');
};

export const saveUser = async (user: any) => {
    localStorage.setItem('adminUser', JSON.stringify(user));
};

export const getUser = async (): Promise<any | null> => {
    const userStr = localStorage.getItem('adminUser');
    return userStr ? JSON.parse(userStr) : null;
};

export const removeUser = async () => {
    localStorage.removeItem('adminUser');
};
