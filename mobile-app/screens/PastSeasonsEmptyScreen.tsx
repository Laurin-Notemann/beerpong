import { ScrollView, Text, View, ViewProps } from 'react-native';

import { useInsets } from '@/app/useInsets';
import Leaderboard from '@/components/Leaderboard';
import { ThemedView } from '@/components/ThemedView';
import { mockSeasons } from '@/screens/mockSeasons';
import { useTheme } from '@/theme';

export const PastSeasonsEmptyScreen: React.FC = () => {
    const insets = useInsets(true);
    const theme = useTheme();

    return (
        <ScrollView
            style={{ flex: 1, backgroundColor: theme.color.bg }}
            contentContainerStyle={{
                paddingTop: insets.top,
            }}
        >
            <View
                style={{
                    position: 'relative',

                    height: 430,

                    marginTop: 64,
                }}
            >
                <DecorativeSeasonCard
                    {...mockSeasons[0]}
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
                    {...mockSeasons[1]}
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
                    {...mockSeasons[2]}
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

const DecorativeSeasonCard: React.FC<ViewProps & SeasonCardProps> = ({
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

                    height: 16 * 48,
                },
            ]}
        >
            <SeasonCard
                season={season}
                players={players}
                numMatches={numMatches}
            />
        </View>
    );
};

export interface SeasonCardProps {
    season: {
        name: string;
        startDate: string;
        endDate: string;
        numPlayers?: number;
        numMatches?: number;
    };
    players: any[];
    numMatches: number;
}
export const SeasonCard: React.FC<SeasonCardProps> = ({
    season,
    players,
    numMatches,
}) => {
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
