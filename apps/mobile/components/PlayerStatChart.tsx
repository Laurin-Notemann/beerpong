import { useId, useState } from 'react';
import { View } from 'react-native';
import Svg, {
    Circle,
    Defs,
    LinearGradient,
    Path,
    Stop,
} from 'react-native-svg';

import { eloChangeOf } from '@/api/calls/matchHooks';
import { useGroup } from '@/api/calls/seasonHooks';
import { useMatchElo } from '@/api/calls/seasonMatchesHooks';
import { Match, wonMatch } from '@/api/utils/matchDtoToMatch';
import { countCups } from '@/api/utils/ruleMoveCups';
import Text from '@/components/Text';
import {
    getRankingAlgorithm,
    RankingAlgorithm,
    RankingPlayer,
} from '@/constants/rankingAlgorithms';
import { useTheme } from '@/theme';

const HEIGHT = 140;
// keeps the line and its end dot inside the chart
const PAD = 6;

interface HistoryPoint {
    date: Date;
    /** the player's stats after this match */
    player: RankingPlayer;
}

/**
 * The player's stats after each of their matches, oldest first. Elo isn't per match on the
 * client, so it's walked back from the current `elo` with each match's change; it also gets
 * a point before the first match.
 */
function statHistory(
    profileId: string,
    matches: Match[],
    eloChange: (match: Match, playerId: string) => number,
    elo: number
): { start: HistoryPoint | null; points: HistoryPoint[] } {
    const sorted = [...matches].sort(
        (a, b) => a.date.getTime() - b.date.getTime()
    );
    const mine = sorted.flatMap((match) => {
        const me = match.blueTeam
            .concat(match.redTeam)
            .find((i) => i.profileId === profileId);
        return me ? [{ match, me }] : [];
    });

    let runningElo =
        elo - mine.reduce((sum, i) => sum + eloChange(i.match, i.me.id), 0);
    const total = { points: 0, cups: 0, matchesWon: 0, teamSizes: 0 };

    const start = mine.length
        ? {
              date: mine[0].match.date,
              player: {
                  name: '',
                  points: 0,
                  cups: 0,
                  matches: 0,
                  matchesWon: 0,
                  avgTeamSize: 1,
                  elo: runningElo,
              },
          }
        : null;

    const points = mine.map(({ match, me }, index) => {
        runningElo += eloChange(match, me.id);
        total.points += me.points;
        total.cups += countCups(me.moves);
        total.matchesWon += wonMatch(profileId, match) ? 1 : 0;
        total.teamSizes += (
            match.blueTeam.some((i) => i.id === me.id)
                ? match.blueTeam
                : match.redTeam
        ).length;

        const matches = index + 1;
        return {
            date: match.date,
            player: {
                name: '',
                points: total.points,
                cups: total.cups,
                matches,
                matchesWon: total.matchesWon,
                avgTeamSize: total.teamSizes / matches,
                elo: runningElo,
            },
        };
    });
    return { start, points };
}

const formatDate = (date: Date) =>
    date.toLocaleDateString(undefined, { day: 'numeric', month: 'short' });

/** How a player's stat developed over the given matches: a line with a gradient fill below. */
export function PlayerStatChart({
    stat,
    profileId,
    matches,
    elo,
}: {
    stat: RankingAlgorithm;
    profileId: string;
    matches: Match[];
    /** the player's current Elo in this scope */
    elo: number;
}) {
    const theme = useTheme();
    const color = theme.color.text.branding;
    const gradientId = 'fill' + useId().replace(/\W/g, '');

    const [width, setWidth] = useState(0);

    // the Elo changes of every season the matches are from (all time spans several)
    const { groupId } = useGroup();
    const eloByMatch = useMatchElo(groupId, [
        ...new Set(matches.map((m) => m.seasonId)),
    ]);

    const algo = getRankingAlgorithm(stat);
    const history = statHistory(
        profileId,
        matches,
        (match, playerId) =>
            eloChangeOf(eloByMatch.get(match.id), playerId) ?? 0,
        elo
    );
    const points =
        stat === 'ELO' && history.start
            ? [history.start, ...history.points]
            : history.points;

    if (points.length < 2) {
        return (
            <Text
                variant="body2"
                color="secondary"
                style={{ textAlign: 'center', paddingVertical: 24 }}
            >
                Play another match to see a trend.
            </Text>
        );
    }

    const values = points.map((i) => algo.getValue(i.player));
    const min = Math.min(...values);
    const max = Math.max(...values);
    const minPoint = points[values.indexOf(min)];
    const maxPoint = points[values.indexOf(max)];

    const x = (index: number) => (index / (points.length - 1)) * width;
    // a flat line sits in the middle
    const y = (value: number) =>
        max === min
            ? HEIGHT / 2
            : PAD + (1 - (value - min) / (max - min)) * (HEIGHT - 2 * PAD);

    const line = values
        .map((v, i) => `${i ? 'L' : 'M'}${x(i)},${y(v)}`)
        .join(' ');
    const area = `${line} L${width},${HEIGHT} L0,${HEIGHT} Z`;

    const label = (text: string) => (
        <Text variant="fineprint" color="tertiary">
            {text}
        </Text>
    );

    return (
        <View
            style={{ width: '100%', paddingHorizontal: 4, marginTop: 12 }}
            // the head section around it opens the avatar on a tap
            onStartShouldSetResponder={() => true}
        >
            <View
                style={{
                    flexDirection: 'row',
                    justifyContent: 'space-between',
                    marginBottom: 4,
                }}
            >
                <Text variant="body2" bold>
                    {algo.name}
                </Text>
                {label(`max ${algo.getDisplayValue(maxPoint.player)}`)}
            </View>
            <View
                style={{ height: HEIGHT }}
                onLayout={(e) => setWidth(e.nativeEvent.layout.width)}
            >
                {width > 0 && (
                    <Svg width={width} height={HEIGHT}>
                        <Defs>
                            <LinearGradient
                                id={gradientId}
                                x1="0"
                                y1="0"
                                x2="0"
                                y2="1"
                            >
                                <Stop
                                    offset="0"
                                    stopColor={color}
                                    stopOpacity={0.4}
                                />
                                <Stop
                                    offset="1"
                                    stopColor={color}
                                    stopOpacity={0}
                                />
                            </LinearGradient>
                        </Defs>
                        <Path d={area} fill={`url(#${gradientId})`} />
                        <Path
                            d={line}
                            stroke={color}
                            strokeWidth={2.5}
                            strokeLinejoin="round"
                            strokeLinecap="round"
                            fill="none"
                        />
                        <Circle
                            cx={x(values.length - 1)}
                            cy={y(values[values.length - 1])}
                            r={4}
                            fill={color}
                        />
                    </Svg>
                )}
            </View>
            <View
                style={{
                    flexDirection: 'row',
                    justifyContent: 'space-between',
                    marginTop: 4,
                }}
            >
                {label(formatDate(points[0].date))}
                {label(`min ${algo.getDisplayValue(minPoint.player)}`)}
                {label(formatDate(points[points.length - 1].date))}
            </View>
        </View>
    );
}
