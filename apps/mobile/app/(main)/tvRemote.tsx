import { Stack } from 'expo-router';
import { ActivityIndicator, Alert, ScrollView, Text, View } from 'react-native';

import { useGroup } from '@/api/calls/seasonHooks';
import {
    Tv,
    useCameras,
    useRemoveCamera,
    useTvMatches,
    useTvs,
} from '@/api/calls/tvHooks';
import { env } from '@/api/env';
import { LiveDot } from '@/components/liveMatch/LiveDot';
import {
    Card,
    Chevron,
    Row,
    scopeLabel,
    screenLabel,
    Section,
    useRemoteTokens,
} from '@/components/tvRemote/RemoteParts';
import { useNavStyles } from '@/lib/navigation/navStyles';
import { useNavigation } from '@/lib/navigation/useNavigation';
import { screenOf } from '@/lib/tvDisplay';
import { useInsets } from '@/lib/useInsets';

/**
 * The Versus TVs that are on and show the group; picking one opens its remote (`tv`). Add TV
 * puts the group on another one with the code it shows (`addTv`). Under them the group's
 * cameras, whose video a TV can show.
 */
export default function Page() {
    const insets = useInsets(true);
    const t = useRemoteTokens();
    const nav = useNavigation();
    const { groupId, seasonId, group } = useGroup();
    const tvsQuery = useTvs(groupId);
    const tvs = tvsQuery.data ?? [];
    const liveIds = useTvMatches(groupId, seasonId ?? null).map((i) => i.id);
    const groupName = group?.data?.name ?? 'your group';

    // what the TV shows, as its remote says it
    const showing = (tv: Tv) => {
        const screen = screenOf(tv.config, liveIds);
        if (screen === 'camera' && !liveIds.length)
            return `Camera Auto · Leaderboard · ${scopeLabel(tv.config.scope)}`;
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
                    paddingTop: insets.top + 20,
                    paddingBottom: insets.bottom + 32,
                    paddingHorizontal: 16,
                    gap: 32,
                }}
            >
                <Section
                    title={`Showing ${groupName}`}
                    footer={
                        tvsQuery.isLoading
                            ? undefined
                            : tvsQuery.error && !tvs.length
                              ? 'Couldn’t reach Versus TV.'
                              : tvs.length
                                ? undefined
                                : 'No TV right now. A TV shows up here while its page is open.'
                    }
                >
                    {tvsQuery.isLoading && <ActivityIndicator />}
                    {tvs.length > 0 && (
                        <Card>
                            {tvs.map((tv) => (
                                <Row
                                    key={tv.id}
                                    icon="television"
                                    selected
                                    haptic={false}
                                    onPress={() =>
                                        nav.navigate('tv', { id: tv.id })
                                    }
                                    trailing={<Chevron />}
                                >
                                    <Text
                                        numberOfLines={1}
                                        style={{ color: t.text, fontSize: 17 }}
                                    >
                                        {tv.name}
                                    </Text>
                                    <View
                                        style={{
                                            flexDirection: 'row',
                                            alignItems: 'center',
                                            gap: 6,
                                            marginTop: 1,
                                        }}
                                    >
                                        <LiveDot size={7} />
                                        <Text
                                            numberOfLines={1}
                                            style={{
                                                color: t.textSecondary,
                                                fontSize: 13,
                                            }}
                                        >
                                            {showing(tv)}
                                        </Text>
                                    </View>
                                </Row>
                            ))}
                        </Card>
                    )}
                </Section>

                <Section
                    footer={`Open ${env.tvBaseUrl.replace(/^https?:\/\//, '')}/tv on a TV, then add it with the code it shows.`}
                >
                    <Card>
                        <Row
                            icon="plus"
                            title="Add TV"
                            haptic={false}
                            onPress={() => nav.navigate('addTv')}
                            trailing={<Chevron />}
                        />
                    </Card>
                </Section>
                {!tvsQuery.isLoading && <Cameras groupId={groupId} />}
            </ScrollView>
        </>
    );
}

/** the group's cameras that are on; tapping one takes the group off it */
function Cameras({ groupId }: { groupId: string | null }) {
    const nav = useNavigation();
    const cameras = useCameras(groupId).data ?? [];
    const remove = useRemoveCamera(groupId);

    return (
        <Section
            title="Cameras"
            footer="A laptop or phone at the table films it, and a TV shows the video with the score over it: choose Camera on the TV."
        >
            <Card>
                {cameras.map((camera) => (
                    <Row
                        key={camera.id}
                        icon="video-outline"
                        title={camera.name}
                        subtitle="On"
                        selected
                        haptic={false}
                        disabled={remove.isPending}
                        onPress={() =>
                            Alert.alert(
                                'Remove Group from Camera',
                                'The camera shows its code again, and TVs stop showing its video.',
                                [
                                    { text: 'Cancel', style: 'cancel' },
                                    {
                                        text: 'Remove',
                                        style: 'destructive',
                                        onPress: () => remove.mutate(camera.id),
                                    },
                                ]
                            )
                        }
                    />
                ))}
                <Row
                    icon="plus"
                    title="Add Camera"
                    haptic={false}
                    onPress={() => nav.navigate('addTv', { kind: 'camera' })}
                    trailing={<Chevron />}
                />
            </Card>
        </Section>
    );
}
