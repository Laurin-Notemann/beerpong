/** the spaced format of group invite codes. `[3, 4, 3]` => `"xxx xxxx xxx"` */
const groupCodeFormat = [3, 3, 3];

const host = 'localhost:8080';

const groupCodeSeperatorIndices = groupCodeFormat.slice(1).map((_, idx) => {
    return groupCodeFormat.slice(0, idx + 1).reduce((sum, i) => sum + i, 0) - 1;
});

export const env = {
    apiBaseUrl: 'http://' + host,
    realtimeBaseUrl: 'ws://' + host,

    groupCode: {
        format: groupCodeFormat,
        length: groupCodeFormat.reduce((sum, i) => sum + i, 0),
        seperatorIndices: groupCodeSeperatorIndices,
    },
    appVersion: '0.1.0',
};
