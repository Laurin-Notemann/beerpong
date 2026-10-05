import { env } from '@/api/env';

export const formatGroupCode = (input: string): string => {
    const parts: string[] = [];
    let lastIndex = 0;

    env.groupCode.seperatorIndices.forEach((index) => {
        parts.push(input.slice(lastIndex, index + 1));
        lastIndex = index + 1;
    });
    parts.push(input.slice(lastIndex));

    return parts.join(' ');
};
