import dayjs, { Dayjs } from 'dayjs';

/** the spaced format of group invite codes. `[3, 4, 3]` => `"xxx xxxx xxx"` */
const groupCodeFormat = [3, 3, 3];

const host = 'localhost:8080';

const groupCodeSeperatorIndices = groupCodeFormat.slice(1).map((_, idx) => {
    return groupCodeFormat.slice(0, idx + 1).reduce((sum, i) => sum + i, 0) - 1;
});

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
        return date.format('DD.MM.YYYY'); // Full date format, e.g., "10.10.2024"
    }
};

export const env = {
    apiBaseUrl: 'http://' + host,
    realtimeBaseUrl: 'ws://' + host,

    groupCode: {
        format: groupCodeFormat,
        length: groupCodeFormat.reduce((sum, i) => sum + i, 0),
        seperatorIndices: groupCodeSeperatorIndices,
    },
    appVersion: '0.1.0',

    format: {
        date: {
            seasonStartAndEnd: (date: Dayjs) => date.format('DD.MM.YYYY'),
            matchesSeperatorDay: getDayName,
            matchHour: (date: Dayjs) => date.format('hh:mm'),
        },
    },
};
