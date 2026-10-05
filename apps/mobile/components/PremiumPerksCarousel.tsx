import { Text, View } from 'react-native';
import { ScrollView } from 'react-native-gesture-handler';
import { useSharedValue } from 'react-native-reanimated';

import { Icon, IconName } from '@/components/Icon';
import { Swiper } from '@/components/Swiper';
import { useTheme } from '@/theme';

interface PremiumPerk {
    title: string;
    icon: IconName;
    description: string;
}

/** Planned premium features. They remain available while store setup is in progress. */
const perks: PremiumPerk[] = [
    {
        title: 'Seasons',
        icon: 'cached',
        description:
            'Start a fresh leaderboard whenever you like: every weekend, after a vacation. Past seasons stay saved.',
    },
    {
        title: 'Photos',
        icon: 'image-multiple',
        description:
            'Profile pictures for every player, a wallpaper for the group and a photo of each team after the match.',
    },
    {
        title: 'Pro Mode',
        icon: 'bullseye-arrow',
        description:
            'Track a match live, cup by cup, and see who scored which one.',
    },
    {
        title: 'Versus TV',
        icon: 'television',
        description:
            'Put the live match and the leaderboard on a TV for everyone at the party.',
    },
];

const PremiumPerkCard = ({ title, icon, description }: PremiumPerk) => {
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

            <Icon name={icon} size={96} color={theme.color.premium} />

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

/** The perks, one card per page, with `children` (the buttons) below. */
export const PremiumPerksCarousel = ({
    children,
}: {
    children?: React.ReactNode;
}) => {
    const theme = useTheme();
    const swiperProgress = useSharedValue(0);

    return (
        <View>
            <View style={{ height: 320 }}>
                <Swiper swiperProgress={swiperProgress}>
                    {perks.map((perk) => (
                        <ScrollView
                            key={perk.title}
                            contentContainerStyle={{
                                paddingHorizontal:
                                    theme.carousel.peekGap +
                                    theme.carousel.peekSize,
                            }}
                        >
                            <PremiumPerkCard {...perk} />
                        </ScrollView>
                    ))}
                </Swiper>
            </View>
            <View
                style={{
                    gap: 8,
                    paddingHorizontal:
                        theme.carousel.peekGap + theme.carousel.peekSize,

                    paddingTop: 16,
                }}
            >
                {children}
            </View>
        </View>
    );
};
