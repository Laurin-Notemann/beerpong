import dayjs from 'dayjs';
import React from 'react';
import { Text, View } from 'react-native';
import { TouchableHighlight } from 'react-native-gesture-handler';

import { eloChangeOf } from '@/api/calls/matchHooks';
import { env } from '@/api/env';
import { Match } from '@/api/utils/matchDtoToMatch';
import { EloChange } from '@/components/EloChange';
import MatchVsHeader from '@/components/MatchVsHeader';
import { NextMatchCard } from '@/components/next/NextMatchCard';
import { MatchEloDto } from '@/openapi/openapi';
import { useTheme } from '@/theme';
import { useNewDesign } from '@/zustand/localSettingsStore';

const timeColumnWidth = 44;

/** a match that isn't on the server yet is dimmed, like an unsent message */
const queuedStyle = { opacity: 0.5 };

/** the team's names, each with the player's Elo change in the match */
const teamNames = (team: Match['blueTeam'], elo: MatchEloDto | undefined) =>
    team.map((i, idx) => (
        <React.Fragment key={i.id}>
            {idx > 0 ? ', ' : ''}
            {i.name || 'Unknown'}
            <EloChange value={eloChangeOf(elo, i.id)} />
        </React.Fragment>
    ));

const MatchesListItemInner: React.FC<{
    match: Match;
    onPress: () => void;
    highlightedId?: string;
    border?: boolean;
    /** the players' Elo changes in the match, once loaded */
    elo?: MatchEloDto;
}> = ({ match, onPress, highlightedId, border = true, elo }) => {
    const theme = useTheme();
    const newDesign = useNewDesign();

    if (newDesign) {
        return (
            <View style={match.isQueued && queuedStyle}>
                <NextMatchCard
                    match={match}
                    onPress={onPress}
                    highlightedId={highlightedId}
                    elo={elo}
                />
            </View>
        );
    }

    return (
        <TouchableHighlight
            underlayColor={theme.panel.light.active}
            style={{
                gap: 4,
                paddingHorizontal: 16,
                paddingVertical: 7,

                borderTopColor: border ? theme.panel.light.active : undefined,
                borderTopWidth: border ? 0.5 : undefined,
                ...(match.isQueued && queuedStyle),
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
                        {teamNames(match.blueTeam, elo)} -{' '}
                        {teamNames(match.redTeam, elo)}
                    </Text>
                    {/* balances the time column so the names center under the score */}
                    <View style={{ width: timeColumnWidth }} />
                </View>
            </View>
        </TouchableHighlight>
    );
};

// Converted matches are cached per DTO (matchDtoToMatch), so a changed match is a new object;
// so is a changed `elo` (useMatchElo). `onPress` is ignored: it only navigates to the match,
// which doesn't go stale.
export const MatchesListItem = React.memo(
    MatchesListItemInner,
    (prev, next) =>
        prev.match === next.match &&
        prev.highlightedId === next.highlightedId &&
        prev.border === next.border &&
        prev.elo === next.elo
);
