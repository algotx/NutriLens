import * as SecureStore from 'expo-secure-store';

export const saveToken = (token) => SecureStore.setItemAsync('token', token);
export const getToken = () => SecureStore.getItemAsync('token');
export const removeToken = () => SecureStore.deleteItemAsync('token');

export const saveUser = (user) => SecureStore.setItemAsync('user', JSON.stringify(user));
export const getUser = async () => {
  const u = await SecureStore.getItemAsync('user');
  return u ? JSON.parse(u) : null;
};
export const removeUser = () => SecureStore.deleteItemAsync('user');
