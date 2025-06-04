import { Text, View, ViewProps } from 'react-native';

import { NoMatchesPlayedYet } from '@/components/emptyStates/NoMatchesPlayedYet';
import { MatchesListItem } from '@/components/MatchesListItem';
import { mockSeasons } from '@/screens/mockSeasons';
import { useTheme } from '@/theme';

export const LeaderboardEmptyComponent: React.FC<{ message?: string }> = ({
    message = 'No Matches Played Yet',
}) => {
    const theme = useTheme();

    return (
        <View style={{ marginBottom: 64 }}>
            <NoMatchesPlayedYet message={message} />
        </View>
    );

    return (
        <>
            <View
                style={{
                    position: 'relative',

                    height: 430,

                    marginTop: 64,
                }}
            >
                <DecorativeMatchCard
                    {...mockSeasons[0]}
                    style={{
                        position: 'absolute',
                        transform: [{ rotateZ: '-20deg' }],

                        left: -200,
                        top: 0,

                        width: 352,

                        shadowColor: '#000',
                        shadowOpacity: 0.5,
                        shadowRadius: 16,
                    }}
                />
                <DecorativeMatchCard
                    {...mockSeasons[1]}
                    style={{
                        position: 'absolute',
                        transform: [{ rotateZ: '15deg' }],

                        left: -200,
                        top: -50,

                        width: 352,

                        shadowColor: '#000',
                        shadowOpacity: 0.5,
                        shadowRadius: 16,
                    }}
                />
                <DecorativeMatchCard
                    {...mockSeasons[2]}
                    style={{
                        position: 'absolute',

                        left: -200,
                        top: 100,

                        width: 352,

                        shadowColor: '#000',
                        shadowOpacity: 0.5,
                        shadowRadius: 16,
                    }}
                />
            </View>
            <View
                style={{
                    alignItems: 'center',
                    gap: 10,
                }}
            >
                <Text
                    style={{
                        fontSize: 22,

                        fontWeight: 'bold',

                        color: theme.color.text.primary,

                        textAlign: 'center',
                    }}
                >
                    {message}
                </Text>
            </View>
        </>
    );
};

const DecorativeMatchCard: React.FC<ViewProps & any> = ({
    style,
    season,
    players,
    numMatches,
    ...props
}) => {
    const theme = useTheme();

    return (
        <View
            style={[
                style,
                {
                    borderRadius: theme.borderRadius.card,
                    backgroundColor: theme.color.modal.bg,

                    transform: [
                        ...(typeof style === 'object' &&
                        style != null &&
                        'transform' in style &&
                        typeof style.transform === 'object'
                            ? style.transform
                            : []),
                        { scale: 0.5 },
                    ],
                },
            ]}
        >
            <MatchesListItem
                match={{
                    id: 'decorative-match',
                    blueCups: 5,
                    redCups: 10,
                    winnerTeamId: 'blue',
                    date: new Date(),
                    blueTeam: [
                        {
                            id: '#1',
                            change: 0,
                            moves: [],
                            name: 'Linus',
                            points: 123,
                            team: 'blue',
                        },
                        {
                            id: '#2',
                            change: 0,
                            moves: [],
                            name: 'Thies',
                            points: 123,
                            team: 'blue',
                        },
                    ],
                    redTeam: [
                        {
                            id: '#1',
                            change: 0,
                            moves: [],
                            name: 'Timon',
                            points: 123,
                            team: 'red',
                        },
                        {
                            id: '#2',
                            change: 0,
                            moves: [],
                            name: 'Elina',
                            points: 123,
                            team: 'red',
                        },
                    ],
                }}
                onPress={() => {}}
            />
        </View>
    );
};
