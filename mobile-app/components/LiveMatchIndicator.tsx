import { useRef, useState } from 'react';
import { View } from 'react-native';

import { MinimalMatch } from '@/api/utils/matchDtoToMatch';
import { useNavigation } from '@/app/navigation/useNavigation';
import MatchVsHeader from '@/components/MatchVsHeader';
import PressableScale from '@/components/PressableScale';
import Text from '@/components/Text';
import { useInterval } from '@/components/useInterval';

const EXPERIMENTAL_LIVE_MATCHES = false;

export function useRerenderEverySecond() {
    const [, setNow] = useState(Date.now());

    useInterval(() => setNow(Date.now()), 100);
}

export function LiveMatchIndicator() {
    const liveMatchStartDate = useRef(new Date());

    const matchesInProgress: (MinimalMatch & { startDate: Date })[] = [
        {
            id: '#',
            date: new Date(),
            startDate: liveMatchStartDate.current!,
            blueCups: 6,
            redCups: 3,
            blueTeam: [
                {
                    id: '#',
                    profileId: '#',
                    moves: [],
                    name: 'Thies',
                    team: 'blue',
                    points: 0,
                    change: 0,
                },
                {
                    id: '#',
                    profileId: '#',
                    moves: [],
                    name: 'Bolls',
                    team: 'blue',
                    points: 0,
                    change: 0,
                },
            ],
            redTeam: [
                {
                    id: '#',
                    profileId: '#',
                    moves: [],
                    name: 'Schicke',
                    team: 'red',
                    points: 0,
                    change: 0,
                },
                {
                    id: '#',
                    profileId: '#',
                    moves: [],
                    name: 'Ole',
                    team: 'red',
                    points: 0,
                    change: 0,
                },
            ],
        },
    ];

    useRerenderEverySecond();

    const nav = useNavigation();

    if (matchesInProgress.length === 0) return null;

    const focusedMatch = matchesInProgress[0];

    if (!EXPERIMENTAL_LIVE_MATCHES) return null;

    return (
        <PressableScale onPress={() => nav.navigate('newMatch')}>
            <View
                style={{
                    borderRadius: 8,

                    backgroundColor: '#1CD760',

                    // height: 56,
                    paddingHorizontal: 20,
                    paddingVertical: 0,

                    flexDirection: 'row',

                    alignItems: 'center',

                    justifyContent: 'space-between',

                    overflow: 'hidden',
                }}
            >
                <Text
                    color="primary"
                    variant="body2"
                    style={{
                        fontWeight: 'bold',
                        color: 'black',

                        fontSize: 13,
                    }}
                >
                    {String(
                        Math.floor(
                            (Date.now() - focusedMatch.startDate.getTime()) /
                                1000 /
                                60
                        )
                    ).padStart(2, '0') +
                        ':' +
                        String(
                            Math.floor(
                                ((Date.now() -
                                    focusedMatch.startDate.getTime()) /
                                    1000) %
                                    60
                            )
                        ).padStart(2, '0')}
                </Text>
                <MatchVsHeader
                    style={{
                        transform: [{ scale: 0.8 }],
                    }}
                    match={focusedMatch}
                />
                <Text
                    color="primary"
                    variant="body2"
                    style={{
                        fontWeight: 'bold',
                        color: 'black',
                        fontSize: 13,
                        opacity: 0,
                    }}
                >
                    {String(
                        Math.floor(
                            (Date.now() - focusedMatch.startDate.getTime()) /
                                1000 /
                                60
                        )
                    ).padStart(2, '0') +
                        ':' +
                        String(
                            Math.floor(
                                ((Date.now() -
                                    focusedMatch.startDate.getTime()) /
                                    1000) %
                                    60
                            )
                        ).padStart(2, '0')}
                </Text>
            </View>
        </PressableScale>
    );
}
