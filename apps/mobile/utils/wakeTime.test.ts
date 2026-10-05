import { describe, expect, it } from 'vitest';

import {
    formatWakeTime,
    getNextWakeTime,
    getWakeTimeDayStart,
    parseWakeTime,
    toWakeTime,
} from '@/utils/wakeTime';

describe('wakeTime', () => {
    it('parses the backend format', () => {
        expect(parseWakeTime('06:30')).toEqual({ hour: 6, minute: 30 });
        expect(parseWakeTime(undefined)).toEqual({ hour: 0, minute: 0 });
    });

    it('formats', () => {
        expect(toWakeTime(new Date(2025, 0, 1, 6, 5))).toBe('06:05');
        expect(formatWakeTime('06:00')).toBe('6:00');
    });

    it('a day starts at the wake time', () => {
        expect(getWakeTimeDayStart(new Date(2025, 0, 2, 7), '06:30')).toEqual(
            new Date(2025, 0, 2, 6, 30)
        );
        expect(getWakeTimeDayStart(new Date(2025, 0, 2, 5), '06:30')).toEqual(
            new Date(2025, 0, 1, 6, 30)
        );
    });

    it('resets at the next wake time, which can still be today', () => {
        // 01:21 with an 8:00 wake time: the day started yesterday and resets at 8:00 today
        expect(getNextWakeTime(new Date(2025, 0, 2, 1, 21), '08:00')).toEqual(
            new Date(2025, 0, 2, 8)
        );
        expect(getNextWakeTime(new Date(2025, 0, 2, 9), '08:00')).toEqual(
            new Date(2025, 0, 3, 8)
        );
    });
});
