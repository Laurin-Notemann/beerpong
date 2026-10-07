import { Image, ScrollView, View } from 'react-native';

import Button from '@/components/Button';
import Text from '@/components/Text';
import { useNavigation } from '@/lib/navigation/useNavigation';
import { useTheme } from '@/theme';

const phoneImage = require('@/assets/images/phone.png') as number;

export default function OnboardingModal() {
    const navigation = useNavigation();

    const theme = useTheme();

    return (
        <ScrollView
            style={{
                backgroundColor: theme.panel.dark.bg,

                flex: 1,
            }}
            contentContainerStyle={{
                alignItems: 'center',
                gap: 32,

                paddingHorizontal: 16,
                paddingVertical: 32,

                justifyContent: 'center',

                minHeight: '100%',
            }}
        >
            <Text
                variant="h3"
                color="primary"
                bold
                style={{
                    textAlign: 'center',
                    marginBottom: 32,
                    fontSize: 16 * 2,
                }}
            >
                Welcome to{' '}
                <Text
                    variant="h3"
                    color="emphasis"
                    bold
                    style={{
                        fontSize: 16 * 2,
                    }}
                >
                    Versus
                </Text>
                , the leaderboard app!
            </Text>
            {/* <Text variant="body1" color="secondary">
                - sick leaderboard{'\n'}- intuitively assign points {'\n'}- view
                sick stats {'\n'}- Completely free, forever
            </Text> */}
            <View
                style={{
                    flexDirection: 'row',
                }}
            >
                <Image
                    source={phoneImage}
                    style={{
                        width: 100,
                        height: 100 * 2.1741293532,
                        resizeMode: 'contain',

                        // transform: [{ rotateY: '45deg' }],
                        transform: [{ scale: 0.9 }],
                    }}
                />
                <Image
                    source={phoneImage}
                    style={{
                        width: 100,
                        height: 100 * 2.1741293532,
                        resizeMode: 'contain',
                    }}
                />
                <Image
                    source={phoneImage}
                    style={{
                        width: 100,
                        height: 100 * 2.1741293532,
                        resizeMode: 'contain',

                        // transform: [{ rotateY: '-45deg' }],
                        transform: [{ scale: 0.9 }],
                    }}
                />
            </View>
            <View
                style={{
                    alignSelf: 'stretch',
                    gap: 8,
                }}
            >
                <Button
                    variant="primary"
                    title="Join a Friend Group"
                    onPress={() => navigation.navigate('joinGroup')}
                />
                <Button
                    variant="secondary"
                    title="Create a Friend Group"
                    onPress={() => navigation.navigate('createGroup')}
                />
            </View>
        </ScrollView>
    );
}
