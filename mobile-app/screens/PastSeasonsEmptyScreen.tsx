import { ScrollView, Text, View, ViewProps } from 'react-native';

import Leaderboard from '@/components/Leaderboard';
import { ThemedView } from '@/components/ThemedView';
import { theme } from '@/theme';

export const PastSeasonsEmptyScreen: React.FC = () => {
    return (
        <ScrollView style={{ flex: 1, backgroundColor: theme.color.bg }}>
            <View
                style={{
                    position: 'relative',

                    height: 430,

                    marginTop: 64,
                }}
            >
                <DecorativeSeasonCard
                    style={{
                        position: 'absolute',
                        transform: [{ rotateZ: '-20deg' }],

                        right: 60,
                        top: -170,

                        width: 352,

                        shadowColor: '#000',
                        shadowOpacity: 0.5,
                        shadowRadius: 16,
                    }}
                />
                <DecorativeSeasonCard
                    style={{
                        position: 'absolute',
                        transform: [{ rotateZ: '15deg' }],

                        left: 80,
                        top: -170,

                        width: 352,

                        shadowColor: '#000',
                        shadowOpacity: 0.5,
                        shadowRadius: 16,
                    }}
                />
                <DecorativeSeasonCard
                    style={{
                        position: 'absolute',

                        top: -170,

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
                    Seasons
                </Text>
                <View
                    style={{
                        width: 288,
                    }}
                >
                    <Text
                        style={{
                            fontSize: 15,
                            lineHeight: 20,

                            color: theme.color.text.secondary,

                            textAlign: 'center',

                            width: 288,
                        }}
                    >
                        Seasons allow you to reset your leaderboard without
                        losing the results! When you start a new season, your
                        current leaderboard will still be visible here.
                    </Text>
                </View>
            </View>
        </ScrollView>
    );
};

const DecorativeSeasonCard: React.FC<ViewProps> = ({ style, ...props }) => {
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

                    height: 16 * 48,
                },
            ]}
        >
            <SeasonCard
                season={{
                    name: 'Vacation Kroatia',
                    startDate: '',
                    endDate: '',
                }}
                players={[
                    {
                        id: '#0',
                        name: 'Moritz',
                        points: 120,
                        matches: 10,
                        matchesWon: 10,
                    },
                    {
                        id: '#1',
                        name: 'Timon',
                        points: 120,
                        matches: 10,
                        matchesWon: 10,
                    },
                    {
                        id: '#2',
                        name: 'Bolls',
                        points: 120,
                        matches: 10,
                        matchesWon: 10,
                    },
                    {
                        id: '#3',
                        name: 'Ole',
                        points: 120,
                        matches: 10,
                        matchesWon: 10,
                    },
                    {
                        id: '#4',
                        name: 'Thies',
                        points: 120,
                        matches: 10,
                        matchesWon: 10,
                    },
                ]}
                numMatches={0}
            />
        </View>
    );
};

export const SeasonCard: React.FC<{
    season: {
        name: string;
        startDate: string;
        endDate: string;
        numPlayers?: number;
        numMatches?: number;
    };
    players: any[];
    numMatches: number;
}> = ({ season, players, numMatches }) => {
    return (
        <ThemedView
            style={{
                flex: 1,

                paddingBottom: 32,
            }}
        >
            <Leaderboard
                players={players}
                showUnranked={false}
                season={{ ...season, numPlayers: players.length, numMatches }}
            />
        </ThemedView>
    );
};
