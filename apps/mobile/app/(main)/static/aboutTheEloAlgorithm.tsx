import { Stack } from 'expo-router';
import { ScrollView } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Heading } from '@/components/Menu/MenuSection';
import Text from '@/components/Text';
import { AppBackground } from '@/lib/Background';
import { useNavStyles } from '@/lib/navigation/navStyles';

export default function Page() {
    return (
        <GestureHandlerRootView>
            <Stack.Screen
                options={{
                    ...useNavStyles(),
                    headerTitle: 'About the Elo Algorithm',
                }}
            />
            <AppBackground />
            <ScrollView
                style={{ flex: 1 }}
                contentContainerStyle={{
                    paddingHorizontal: 16,

                    paddingBottom: 32,
                }}
            >
                <SafeAreaView>
                    <Heading
                        title="How Versus ranks players on the leaderboard"
                        paragraph
                        border={false}
                    />

                    <Text paragraph>
                        The simplest way to rank players would be to just sort
                        them by their <Text code>average points</Text> per
                        match. But this approach quickly hits its limits: {'\n'}
                        {'\n'}When a weaker player wins against a much stronger
                        opponent, we want them to be rewarded{' '}
                        <Text code>proportionally</Text>.{'\n'}We also don't
                        want stronger players to team up against weaker ones to
                        farm easy wins.{'\n'}
                        That's why we designed an Elo-based ranking system,
                        fine-tuned for <Text code>
                            beerpong performance
                        </Text>{' '}
                        and battle tested with our friends.{'\n'}This is the
                        same stuff they use for chess, just way more
                        complicated, because it has to work for more than two
                        players!
                    </Text>

                    <Heading title="How it works" paragraph />

                    <Text paragraph>
                        Every player starts each season with an Elo of{' '}
                        <Text code>1500</Text>. Before a match, everyone's Elo
                        splits it up: you're expected a <Text code>share</Text>{' '}
                        of all the points the match will have. It's bigger the
                        better you are than the others, and bigger in a smaller
                        team, because you throw more often. After the match, two
                        things move your Elo:
                        {'\n'}
                        {'\n'}
                        <Text code>Your hitting</Text>: your own points against
                        your share of the points the match actually had. Score
                        more than your share and you gain, less and you lose,
                        measured against what an average player scores in a full
                        game, so a 1v1 counts like a 2v2.{'\n'}
                        {'\n'}
                        <Text code>The result</Text>: did your team win, and how
                        likely was that? Beating a stronger team earns more,
                        losing to a weaker one costs more. A ring win counts
                        more than a normal one. Everyone on the team gets the
                        same.{'\n'}
                        {'\n'}
                        If you keep scoring above your share, your Elo rises
                        until your share is what you score. How much each part
                        counts is a season setting (Elo Weights).
                    </Text>

                    {/* <Leaderboard
                        minMatchesRequiredToBeRanked={1}
                        showUnranked={false}
                        withPodium={false}
                        rankingAlgorithm="ELO"
                        style={{
                            transform: [{ scale: 0.8 }],
                            pointerEvents: 'none',

                            borderRadius: theme.borderRadius.card,
                            backgroundColor: theme.color.modal.bg,
                        }}
                        players={[
                            {
                                id: '#1',
                                elo: 1500,
                                name: 'Moritz',
                                points: 2,
                                matches: 3,
                                matchesWon: 3,
                            },
                            {
                                id: '#2',
                                elo: 1500,
                                name: 'Laurin',
                                points: 2,
                                matches: 3,
                                matchesWon: 3,
                            },
                            {
                                id: '#3',
                                elo: 1500,
                                name: 'Schicke',
                                points: 2,
                                matches: 3,
                                matchesWon: 3,
                            },
                            {
                                id: '#4',
                                elo: 1500,
                                name: 'Ole',
                                points: 2,
                                matches: 3,
                                matchesWon: 3,
                            },
                            {
                                id: '#5',
                                elo: 1500,
                                name: 'Elina',
                                points: 2,
                                matches: 3,
                                matchesWon: 3,
                            },
                        ]}
                    /> */}
                </SafeAreaView>
            </ScrollView>
        </GestureHandlerRootView>
    );
}
