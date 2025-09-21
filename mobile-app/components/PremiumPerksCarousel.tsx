import { Dimensions, Text, View } from 'react-native';
import { ScrollView } from 'react-native-gesture-handler';
import Carousel from 'react-native-reanimated-carousel';

import Button from '@/components/Button';
import { useTheme } from '@/theme';

const { width } = Dimensions.get('window');

interface PremiumPerk {
    title: string;
    description: string;
}

const perks: PremiumPerk[] = [
    {
        title: 'Seasons\n',
        description:
            'Reset the leaderboard of a group but save the results using seasons! Do it every weekend, or after a vacation.',
    },
    {
        title: 'Profile Pictures, Group Wallpapers, and Team Photos',
        description:
            'Reset the leaderboard of a group but save the results using seasons! Do it every weekend, or after a vacation.',
    },
    {
        title: 'Beerpong Pro Mode\n',
        description:
            "Ever wanted to specifically track who scored which cup? No? Well, you'll be able to anyway using pro mode!",
    },
    {
        title: 'iOS Homescreen Widget\n',
        description:
            'Reset the leaderboard of a group but save the results using seasons! Do it every weekend, or after a vacation.',
    },
    {
        title: 'Screencast your Leaderboard\n',
        description:
            'Reset the leaderboard of a group but save the results using seasons! Do it every weekend, or after a vacation.',
    },
];

const PremiumPerkCard = ({ title, description }: PremiumPerk) => {
    const theme = useTheme();

    return (
        <View
            style={{
                alignItems: 'center',

                paddingHorizontal: 32,
                paddingTop: 32,
                paddingBottom: 45,
                gap: 20,

                backgroundColor: theme.color.modal.bg,

                borderRadius: 10,
            }}
        >
            <Text
                style={{
                    fontSize: 17,
                    fontWeight: 600,

                    color: theme.color.text.primary,

                    textAlign: 'center',
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

                    color: theme.color.text.secondary,

                    textAlign: 'center',
                }}
            >
                {description}
            </Text>
        </View>
    );
};

export const PremiumPerksCarousel = ({
    onGetPremiumPress,
    onSecondaryActionPress,
}: {
    onGetPremiumPress: () => void;
    onSecondaryActionPress: () => void;
}) => {
    const theme = useTheme();

    return (
        <View
            style={{
                height: 512 + 8,
            }}
        >
            <Carousel
                data={perks}
                height={400}
                loop={false}
                width={
                    width - theme.carousel.peekGap - theme.carousel.peekSize * 2
                }
                style={{ width }}
                renderItem={(perk) => (
                    <ScrollView
                        style={{
                            marginHorizontal: theme.carousel.peekGap / 2,
                            left:
                                theme.carousel.peekGap / 2 +
                                theme.carousel.peekSize,
                        }}
                    >
                        <PremiumPerkCard
                            title={perk.item.title}
                            description={perk.item.description}
                        />
                    </ScrollView>
                )}
            />
            <View
                style={{
                    gap: 8,
                    paddingHorizontal:
                        theme.carousel.peekGap + theme.carousel.peekSize,

                    paddingTop: 16,
                }}
            >
                <Button
                    variant="primary"
                    size="large"
                    title="Get Premium for 5€ / Year"
                    onPress={onGetPremiumPress}
                />
                <Button
                    variant="secondary"
                    size="large"
                    title="Check out our Website"
                    onPress={onSecondaryActionPress}
                />
            </View>
        </View>
    );
};
