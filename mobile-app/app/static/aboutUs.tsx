import { Stack } from 'expo-router';
import { ScrollView, Text } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';

import { useNavStyles } from '@/app/navigation/navStyles';
import { useInsets } from '@/app/useInsets';
import { useTheme } from '@/theme';

export default function Page() {
    const insets = useInsets(true);
    const theme = useTheme();

    return (
        <GestureHandlerRootView>
            <Stack.Screen
                options={{
                    ...useNavStyles(),
                    headerTitle: 'About Us',
                }}
            />
            <ScrollView
                style={{
                    flex: 1,

                    backgroundColor: theme.color.bg,
                }}
                contentContainerStyle={{
                    paddingTop: insets.top,
                    paddingHorizontal: 16,

                    paddingBottom: 128,
                }}
            >
                <Text style={{ color: theme.color.text.primary }}>
                    Did you expect this app to be the product of a soulless
                    corporation? Far from it! We are a group of eight german
                    university students. While on vacation, we got the idea of
                    tracking our beerpong matches on a leaderboard. We quickly
                    built the first prototype in Excel, and it served us well
                    for the rest of the vacation. We would have liked some more
                    features however, and so the idea for a purpose-built app
                    began to ripen in our heads. Two months later we organised a
                    hackathon at one of our homes, and built this app over the
                    course of a week. We are actively working on updates, and
                    we'd appreciate if you could give us an Insta follow,
                    feature suggestions, or just some pictures of your friend
                    group using our app :)
                </Text>
            </ScrollView>
        </GestureHandlerRootView>
    );
}
