import dayjs from 'dayjs';
import React from 'react';
import { Text, View } from 'react-native';
import { TouchableHighlight } from 'react-native-gesture-handler';

import { env } from '@/api/env';
import { Match } from '@/api/utils/matchDtoToMatch';
import MatchVsHeader from '@/components/MatchVsHeader';
import { useTheme } from '@/theme';

const timeColumnWidth = 44;

const teamNames = (team: Match['blueTeam']) =>
    team.map((i) => i.name || 'Unknown').join(', ');

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

                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                    <Text
                        style={{
                            width: timeColumnWidth,
                            fontSize: 15,
                            color: theme.color.text.tertiary,
                            fontVariant: ['tabular-nums'],
                        }}
                    >
                        {env.format.date.matchHour(dayjs(match.date))}
                    </Text>
                    <Text
                        numberOfLines={2}
                        style={{
                            flex: 1,
                            fontSize: 15,
                            color: theme.color.text.tertiary,
                            textAlign: 'center',
                        }}
                    >
                        {teamNames(match.blueTeam)} - {teamNames(match.redTeam)}
                    </Text>
                    {/* balances the time column so the names center under the score */}
                    <View style={{ width: timeColumnWidth }} />
                </View>
            </View>
        </TouchableHighlight>
    );
};

// Converted matches are cached per DTO (matchDtoToMatch), so a changed match is a new object.
// `onPress` is ignored: it only navigates to the match, which doesn't go stale.
export const MatchesListItem = React.memo(
    MatchesListItemInner,
    (prev, next) =>
        prev.match === next.match &&
        prev.highlightedId === next.highlightedId &&
        prev.border === next.border
);
