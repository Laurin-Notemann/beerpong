import dayjs, { Dayjs } from 'dayjs';

import packageJson from '../package.json';

/** the spaced format of group invite codes. `[3, 4, 3]` => `"xxx xxxx xxx"` */
const groupCodeFormat = [3, 3, 3];

const assertEnvString = (name: string): string => {
    const value = process.env?.[name];

    if (typeof value !== 'string')
        throw new Error('Missing string value process.env.' + name);

    return value;
};

const groupCodeSeperatorIndices = groupCodeFormat.slice(1).map((_, idx) => {
    return groupCodeFormat.slice(0, idx + 1).reduce((sum, i) => sum + i, 0) - 1;
});

const useAmericanFormats = false;

const getDayName = (date: Dayjs) => {
    const today = dayjs();

    const diffDays = today.diff(date, 'day');

    if (diffDays === 0) {
        return 'Today';
    } else if (diffDays === 1) {
        return 'Yesterday';
    } else if (diffDays < 7) {
        return date.format('dddd'); // Day of the week, e.g., "Wednesday"
    } else {
        return date.format(useAmericanFormats ? 'MM/DD/YYYY' : 'DD.MM.YYYY'); // Full date format, e.g., "10.10.2024"
    }
};

export const env = {
    apiBaseUrl: process.env.EXPO_PUBLIC_API_BASE_URL!, //assertEnvString('EXPO_PUBLIC_API_BASE_URL'),
    realtimeBaseUrl: process.env.EXPO_PUBLIC_API_WS_URL!, //assertEnvString('EXPO_PUBLIC_API_WS_URL')!,

    groupCode: {
        format: groupCodeFormat,
        length: groupCodeFormat.reduce((sum, i) => sum + i, 0),
        seperatorIndices: groupCodeSeperatorIndices,
    },
    appVersion: packageJson.version,

    format: {
        date: {
            seasonStartAndEnd: (date: Dayjs) =>
                date.format(useAmericanFormats ? 'MM/DD/YYYY' : 'DD.MM.YYYY'),
            matchesSeperatorDay: getDayName,
            matchHour: (date: Dayjs) =>
                date.format(useAmericanFormats ? 'hh:mm A' : 'HH:mm'),
        },
    },
    isDev: __DEV__,
    sentry: {
        dsn: 'https://48d0726c7648ee3dc2ae1c6f0238d7ed@o4508333440892928.ingest.de.sentry.io/4508333445152848',

        enabled: !__DEV__,
    },
};
