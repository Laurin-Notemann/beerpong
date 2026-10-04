/**
 * parses `SeasonSettingsDto.wakeTime`, which the backend sends as `"HH:mm"`
 */
export function parseWakeTime(wakeTime: string | undefined): {
    hour: number;
    minute: number;
} {
    const [hour, minute] = (wakeTime ?? '').split(':').map(Number);

    return {
        hour: Number.isInteger(hour) ? hour : 0,
        minute: Number.isInteger(minute) ? minute : 0,
    };
}

/**
 * formats a time in the `"HH:mm"` format expected by `SeasonSettingsDto.wakeTime`
 */
export function toWakeTime(date: Date): string {
    const pad = (value: number) => String(value).padStart(2, '0');

    return `${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

/**
 * formats `SeasonSettingsDto.wakeTime` for display, e.g. `"06:30"` => `"6:30"`
 */
export function formatWakeTime(wakeTime: string | undefined): string {
    const { hour, minute } = parseWakeTime(wakeTime);

    return `${hour}:${String(minute).padStart(2, '0')}`;
}

/**
 * the start of the "day" (as used by the daily leaderboard) that `date` belongs to.
 * a day starts at the wake time, not at midnight.
 */
export function getWakeTimeDayStart(
    date: Date,
    wakeTime: string | undefined
): Date {
    const { hour, minute } = parseWakeTime(wakeTime);

    const dayStart = new Date(date);
    dayStart.setHours(hour, minute, 0, 0);

    if (dayStart > date) {
        dayStart.setDate(dayStart.getDate() - 1);
    }
    return dayStart;
}

/** when the daily leaderboard that `date` belongs to resets: the start of the next day */
export function getNextWakeTime(
    date: Date,
    wakeTime: string | undefined
): Date {
    const next = getWakeTimeDayStart(date, wakeTime);
    next.setDate(next.getDate() + 1);
    return next;
}
