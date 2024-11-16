import AsyncStorage from '@react-native-async-storage/async-storage';

const GROUP_ID_KEY = 'groupIds';

export const saveGroupsToDevice = async (value: string[]) => {
    const jsonValue = JSON.stringify(value);
    await AsyncStorage.setItem(GROUP_ID_KEY, jsonValue);
};

export const loadGroupsFromDevice = async () => {
    const jsonValue = await AsyncStorage.getItem(GROUP_ID_KEY);
    const parsed = jsonValue != null ? JSON.parse(jsonValue) : null;

    if (parsed) {
        return parsed;
    } else {
        throw new Error('No group ids found');
    }
};
