import { Stack } from 'expo-router';
import { ActivityIndicator, ScrollView, Text, View } from 'react-native';
import { useReducedMotion } from 'react-native-reanimated';

import { useGroup } from '@/api/calls/seasonHooks';
import { Tv, useTvMatches, useTvs } from '@/api/calls/tvHooks';
import { env } from '@/api/env';
import { Icon } from '@/components/Icon';
import IconHead from '@/components/IconHead';
import { LiveDot } from '@/components/liveMatch/LiveDot';
import { pressFeedback } from '@/components/liveMatch/motion';
import PressableScale from '@/components/PressableScale';
import {
    Hint,
    scopeLabel,
    screenLabel,
    useRemoteTokens,
} from '@/components/tvRemote/RemoteParts';
import { useNavStyles } from '@/lib/navigation/navStyles';
import { useNavigation } from '@/lib/navigation/useNavigation';
import { screenOf } from '@/lib/tvDisplay';
import { useInsets } from '@/lib/useInsets';

/** The Versus TVs that are on and show the group; picking one opens its remote (`tv`). */
export default function Page() {
    const insets = useInsets(true);
    const t = useRemoteTokens();
    const nav = useNavigation();
    const { groupId, seasonId, group } = useGroup();
    const tvsQuery = useTvs(groupId);
    const tvs = tvsQuery.data ?? [];
    const liveIds = useTvMatches(groupId, seasonId ?? null).map((i) => i.id);
    const groupName = group?.data?.name ?? 'your group';

    // what the TV shows, as the remote's tiles say it
    const showing = (tv: Tv) => {
        const screen = screenOf(tv.config, liveIds);
        return screen === 'auto' || screen === 'leaderboard'
            ? `${screenLabel(screen)} · ${scopeLabel(tv.config.scope)}`
            : screenLabel(screen);
    };

    return (
        <>
            <Stack.Screen
                options={{ ...useNavStyles(), headerTitle: 'TV Remote' }}
            />
            <ScrollView
                style={{ flex: 1, backgroundColor: t.theme.color.bg }}
                contentContainerStyle={{
                    paddingTop: insets.top + 16,
                    paddingBottom: insets.bottom + 16,
                    paddingHorizontal: 16,
                    gap: 12,
                }}
            >
                {tvsQuery.isLoading ? (
                    <ActivityIndicator style={{ paddingTop: 64 }} />
                ) : !tvs.length ? (
                    <IconHead
                        style={{ paddingTop: 64, paddingHorizontal: 16 }}
                        iconName="television-off"
                        title={
                            tvsQuery.error
                                ? 'Couldn’t reach Versus TV'
                                : `No TV shows ${groupName}`
                        }
                        description={`Open ${env.tvBaseUrl.replace(/^https?:\/\//, '')}/tv on a TV, scan its code and enter your group code. It shows up here while it's on.`}
                    />
                ) : (
                    <>
                        <Hint>
                            {tvs.length === 1
                                ? `This TV shows ${groupName}.`
                                : `These TVs show ${groupName}.`}
                        </Hint>
                        {tvs.map((tv) => (
                            <TvRow
                                key={tv.id}
                                name={tv.name}
                                showing={showing(tv)}
                                onPress={() =>
                                    nav.navigate('tv', { id: tv.id })
                                }
                            />
                        ))}
                    </>
                )}
            </ScrollView>
        </>
    );
}

function TvRow({
    name,
    showing,
    onPress,
}: {
    name: string;
    showing: string;
    onPress: () => void;
}) {
    const t = useRemoteTokens();
    const reducedMotion = useReducedMotion();

    return (
        <PressableScale
            {...pressFeedback(reducedMotion)}
            onPress={onPress}
            accessibilityRole="button"
            accessibilityLabel={`${name}, shows ${showing}`}
            pressableStyle={{
                flexDirection: 'row',
                alignItems: 'center',
                gap: 14,
                padding: 14,
                borderRadius: 20,
                borderCurve: 'continuous',
                borderWidth: 1,
                borderColor: t.hairline,
                backgroundColor: t.surface,
            }}
        >
            <View
                style={{
                    width: 48,
                    height: 48,
                    borderRadius: 14,
                    borderCurve: 'continuous',
                    alignItems: 'center',
                    justifyContent: 'center',
                    backgroundColor: t.accentTint,
                }}
            >
                <Icon name="television" size={26} color={t.accent} />
            </View>
            <View style={{ flex: 1, minWidth: 0, gap: 2 }}>
                <Text
                    numberOfLines={1}
                    style={{ color: t.text, fontSize: 17, fontWeight: '700' }}
                >
                    {name}
                </Text>
                <View
                    style={{
                        flexDirection: 'row',
                        alignItems: 'center',
                        gap: 6,
                    }}
                >
                    <LiveDot size={7} />
                    <Text
                        numberOfLines={1}
                        style={{ color: t.textSecondary, fontSize: 13 }}
                    >
                        {showing}
                    </Text>
                </View>
            </View>
            <Icon name="chevron-right" size={24} color={t.textSecondary} />
        </PressableScale>
    );
}
