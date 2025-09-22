import dayjs from 'dayjs';
import React from 'react';
import { Text, View } from 'react-native';
import { TouchableHighlight } from 'react-native-gesture-handler';

import { env } from '@/api/env';
import { Match } from '@/api/utils/matchDtoToMatch';
import MatchVsHeader from '@/components/MatchVsHeader';
import { useTheme } from '@/theme';

const MatchesListItemInner: React.FC<{
    match: Match;
    onPress: () => void;
    highlightedId?: string;
    border?: boolean;
}> = ({ match, onPress, highlightedId, border = true }) => {
    const theme = useTheme();

    return (
        <TouchableHighlight
            underlayColor={theme.panel.light.active}
            style={{
                gap: 4,
                paddingHorizontal: 16,
                paddingVertical: 7,

                borderTopColor: border ? theme.panel.light.active : undefined,
                borderTopWidth: border ? 0.5 : undefined,
            }}
            onPress={onPress}
        >
            <View
                style={{
                    flexDirection: 'column',
                    gap: 4,
                }}
            >
                <MatchVsHeader match={match} highlightedId={highlightedId} />

                <View style={{ flexDirection: 'row', gap: 16 }}>
                    <Text
                        style={{
                            fontSize: 15,
                            color: theme.color.text.tertiary,
                        }}
                    >
                        {env.format.date.matchHour(dayjs(match.date))}
                    </Text>
                    <Text
                        style={{
                            fontSize: 15,
                            color: theme.color.text.tertiary,

                            flex: 1,
                        }}
                    >
                        {match.blueTeam.map((i) => i.name).join(', ') +
                            ' - ' +
                            match.redTeam.map((i) => i.name).join(', ')}
                    </Text>
                </View>
            </View>
        </TouchableHighlight>
    );
};

export const MatchesListItem = React.memo(
    MatchesListItemInner,
    (prev, next) => {
        if (
            prev.highlightedId !== next.highlightedId ||
            prev.border !== next.border
        ) {
            return false;
        }
        const a = prev.match;
        const b = next.match;
        return (
            a.id === b.id &&
            a.blueCups === b.blueCups &&
            a.redCups === b.redCups &&
            a.date.getTime() === b.date.getTime()
        );
    }
);
