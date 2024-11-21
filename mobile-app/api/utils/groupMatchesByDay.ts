import dayjs from 'dayjs';

import { env } from '../env';
import { Match } from './matchDtoToMatch';

export const groupMatchesByDay = (matches: Match[]) => {
    const dayjsMap = matches.reduce(
        (
            acc: Record<string, { matches: Match[]; title: string }>,
            obj: Match
        ) => {
            const dayKey = dayjs(obj.date).format('YYYY-MM-DD');

            if (!acc[dayKey]) {
                acc[dayKey] = {
                    matches: [],
                    title: env.format.date.matchesSeperatorDay(dayjs(obj.date)),
                };
            }
            acc[dayKey].matches.push(obj);

            return acc;
        },
        {}
    );
    return Object.values(dayjsMap);
};
