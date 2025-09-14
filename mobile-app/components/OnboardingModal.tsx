import { Image, ScrollView, View } from 'react-native';

import { useNavigation } from '@/app/navigation/useNavigation';
import Button from '@/components/Button';
import Text from '@/components/Text';
import { useTheme } from '@/theme';

// eslint-disable-next-line no-empty-pattern
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
                    color="branding"
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
                    source={require('../assets/images/phone.png')}
                    style={{
                        width: 100,
                        height: 100 * 2.1741293532,
                        resizeMode: 'contain',

                        // transform: [{ rotateY: '45deg' }],
                        transform: [{ scale: 0.9 }],
                    }}
                />
                <Image
                    source={require('../assets/images/phone.png')}
                    style={{
                        width: 100,
                        height: 100 * 2.1741293532,
                        resizeMode: 'contain',
                    }}
                />
                <Image
                    source={require('../assets/images/phone.png')}
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
