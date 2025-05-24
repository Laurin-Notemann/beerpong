import dayjs from 'dayjs';

import { env } from '@/api/env';
import { Match } from '@/api/utils/matchDtoToMatch';

export const groupMatchesByDay = (matches: Match[]) => {
    const dayjsMap = matches.reduce(
        (
            acc: Record<
                string,
                { matches: Match[]; title: string; date: Date }
            >,
            obj: Match
        ) => {
            const dayKey = dayjs(obj.date).format('YYYY-MM-DD');

            if (!acc[dayKey]) {
                acc[dayKey] = {
                    matches: [],
                    title: env.format.date.matchesSeperatorDay(dayjs(obj.date)),
                    date: obj.date,
                };
            }
            acc[dayKey].matches.push(obj);

            return acc;
        },
        {}
    );
    const days = Object.values(dayjsMap);

    days.sort((a, b) => (dayjs(a.date).isAfter(dayjs(b.date)) ? -1 : 1));

    return days;
};
