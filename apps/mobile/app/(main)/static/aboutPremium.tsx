import { Stack } from 'expo-router';
import { ActivityIndicator, Text, View } from 'react-native';

import { useGroup } from '@/api/calls/seasonHooks';
import Button from '@/components/Button';
import { PremiumPerksCarousel } from '@/components/PremiumPerksCarousel';
import { AppBackground } from '@/lib/Background';
import { useNavStyles } from '@/lib/navigation/navStyles';
import {
    useGroupPremium,
    usePremiumActions,
    usePremiumProduct,
} from '@/lib/premium/usePremium';
import { useInsets } from '@/lib/useInsets';
import { useTheme } from '@/theme';

/** Buy and Restore while premium enforcement is deferred until store setup is complete. */
export default function Page() {
    const insets = useInsets(true);
    const theme = useTheme();

    const { groupId, group } = useGroup();
    const premium = useGroupPremium();
    const product = usePremiumProduct();
    const { buy, restore, buying, restoring } = usePremiumActions(groupId);

    const groupName = group?.data?.name ?? 'this group';

    return (
        <View
            style={{
                flex: 1,
                paddingTop: insets.top + 32,
                paddingBottom: insets.bottom,
                backgroundColor: theme.color.bg,
                gap: 24,
            }}
        >
            <Stack.Screen
                options={{
                    ...useNavStyles(),
                    headerTitle: 'Versus Premium',
                }}
            />
            <AppBackground />
            <Text
                style={{
                    color: theme.color.text.secondary,
                    fontSize: 15,
                    textAlign: 'center',
                    paddingHorizontal: 32,
                }}
            >
                {premium
                    ? `Premium is unlocked for ${groupName}. Everyone in the group gets it.`
                    : `A one-time purchase covers ${groupName} and every group you create, for everyone in them. All features are currently available without a purchase.`}
            </Text>
            <PremiumPerksCarousel>
                {!premium && (
                    <Button
                        variant="primary"
                        size="large"
                        title={
                            buying ? (
                                <ActivityIndicator color="#fff" />
                            ) : product.data ? (
                                `Get Premium for ${product.data.displayPrice}`
                            ) : (
                                'Get Premium'
                            )
                        }
                        disabled={!product.data || buying}
                        onPress={() => void buy()}
                    />
                )}
                <Button
                    variant="secondary"
                    size="large"
                    title={
                        restoring ? <ActivityIndicator /> : 'Restore Purchase'
                    }
                    disabled={restoring}
                    onPress={() => void restore()}
                />
                {!product.isPending && !product.data && !premium && (
                    <Text
                        style={{
                            color: theme.color.text.secondary,
                            fontSize: 13,
                            textAlign: 'center',
                        }}
                    >
                        Premium purchases aren’t available yet. All features
                        remain available.
                    </Text>
                )}
            </PremiumPerksCarousel>
        </View>
    );
}
