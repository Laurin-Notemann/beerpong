import { Stack } from 'expo-router';
import { ScrollView } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaView } from 'react-native-safe-area-context';

import { AppBackground } from '@/app/Background';
import { useNavStyles } from '@/app/navigation/navStyles';
import { Heading } from '@/components/Menu/MenuSection';
import Text from '@/components/Text';

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
                        Every player starts the leaderboard with an Elo of{' '}
                        <Text code>1500</Text>.{'\n'}When you play a match, we
                        calculate your <Text code>expected performance</Text>{' '}
                        based on the Elo of both your own team, and your
                        opponents: When you play with stronger players, you're
                        not expected to score as many points as them.{'\n'}We
                        then compare this with your{' '}
                        <Text code>actual performance</Text> based on how many
                        points you scored in the match.{'\n'}Your Elo is then
                        adjusted based on how <Text code>surprisingly</Text> you
                        performed, be it better or worse than expected.
                        {'\n'}This way, winning against stronger opponents
                        results in a big Elo gain, while losing to stronger
                        opponents only results in a small Elo loss.
                        {'\n'}Individual performance is rewarded, but not more
                        than the match result: If your team lost the match, you
                        will <Text code>always</Text> lose Elo, even if you were
                        the top scorer of the match.
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
