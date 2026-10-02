import { describe, expect, it } from 'vitest';

import {
    formatWakeTime,
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
});
