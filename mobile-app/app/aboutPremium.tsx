import { Stack } from 'expo-router';
import { Text, View } from 'react-native';
import {
    GestureHandlerRootView,
    ScrollView,
} from 'react-native-gesture-handler';

import Button from '@/components/Button';
import { theme } from '@/theme';

import { navStyles } from './navigation/navStyles';

interface PremiumPerk {
    title: string;
    description: string;
}

function PremiumPerkCard({ title, description }: PremiumPerk) {
    return (
        <View
            style={{
                alignItems: 'center',

                paddingHorizontal: 32,
                paddingTop: 32,
                paddingBottom: 45,
                gap: 20,

                backgroundColor: '#222',

                borderRadius: 10,
            }}
        >
            <Text
                style={{
                    fontSize: 17,
                    fontWeight: 600,

                    color: theme.color.text.primary,
                }}
            >
                {title}
            </Text>

            <View
                style={{
                    width: 192,
                    height: 192,

                    backgroundColor: '#fff',
                }}
            ></View>

            <Text
                style={{
                    fontSize: 14,
                    fontWeight: 500,

                    color: '#A6A6A6',

                    textAlign: 'center',
                }}
            >
                {description}
            </Text>
        </View>
    );
}

export default function Page() {
    return (
        <GestureHandlerRootView>
            <Stack.Screen
                options={{
                    ...navStyles,
                    headerTitle: 'About Premium',
                }}
            />
            <ScrollView
                style={{
                    flex: 1,

                    backgroundColor: theme.color.bg,
                }}
                contentContainerStyle={{
                    paddingHorizontal: 16,

                    gap: 8,
                }}
            >
                <PremiumPerkCard
                    title="Seasons"
                    description="Reset the leaderboard of a group but save the results using seasons! Do it every weekend, or after a vacation."
                />
                <Button
                    variant="primary"
                    size="large"
                    title="Get Premium for 5€ / Year"
                    onPress={() => {}}
                />
                <Button
                    variant="secondary"
                    size="large"
                    title="Check out our Website"
                    onPress={() => {}}
                />
                <Button
                    variant="default"
                    size="small"
                    title="Check out our Website"
                    onPress={() => {}}
                />
            </ScrollView>
        </GestureHandlerRootView>
    );
}
