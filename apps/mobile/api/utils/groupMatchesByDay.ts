import dayjs from 'dayjs';

import { env } from '@/api/env';
import { Match } from '@/api/utils/matchDtoToMatch';

/** Matches grouped by calendar day, newest day and newest match first. */
export const groupMatchesByDay = (matches: Match[]) => {
    const days = new Map<
        string,
        { matches: Match[]; title: string; date: Date }
    >();

    for (const match of matches) {
        const d = match.date;
        const dayKey = `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;

        let day = days.get(dayKey);
        if (!day) {
            day = {
                matches: [],
                title: env.format.date.matchesSeperatorDay(dayjs(d)),
                date: d,
            };
            days.set(dayKey, day);
        }
        day.matches.push(match);
    }

    const sorted = [...days.values()];
    sorted.sort((a, b) => b.date.getTime() - a.date.getTime());
    for (const day of sorted) {
        day.matches.sort((a, b) => b.date.getTime() - a.date.getTime());
    }
    return sorted;
};
