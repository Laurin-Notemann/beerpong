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
                        <Text code>1500</Text>. After a match, two things move
                        your Elo:{'\n'}
                        {'\n'}
                        <Text code>The result</Text>: did your team win, and how
                        likely was that? Beating a stronger team earns more,
                        losing to a weaker one costs more. A big win, like a
                        ring of fire or a 10:0, counts more than a close one.
                        Everyone on the team gets the same.{'\n'}
                        {'\n'}
                        <Text code>Your hitting</Text>: before the match, your
                        Elo and your opponents' set how many points you should
                        score. Every point above that earns Elo, every point
                        below costs some. What your teammates score doesn't
                        change yours.{'\n'}
                        {'\n'}A win almost always gains Elo and a loss almost
                        always costs some; only a very good or very bad game of
                        your own can turn that around.
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
