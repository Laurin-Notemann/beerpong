import { Stack } from 'expo-router';
import {
    ActivityIndicator,
    Alert,
    Platform,
    ScrollView,
    Text,
    View,
} from 'react-native';
import { useReducedMotion } from 'react-native-reanimated';

import { useGroup } from '@/api/calls/seasonHooks';
import {
    Tv,
    useCameras,
    useRemoveCamera,
    useTvMatches,
    useTvs,
} from '@/api/calls/tvHooks';
import Button from '@/components/Button';
import { Icon, IconName } from '@/components/Icon';
import IconHead from '@/components/IconHead';
import { LiveDot } from '@/components/liveMatch/LiveDot';
import { pressFeedback } from '@/components/liveMatch/motion';
import PressableScale from '@/components/PressableScale';
import {
    Hint,
    RemoteButton,
    scopeLabel,
    screenLabel,
    Section,
    useRemoteTokens,
} from '@/components/tvRemote/RemoteParts';
import { useNavStyles } from '@/lib/navigation/navStyles';
import { useNavigation } from '@/lib/navigation/useNavigation';
import { screenOf } from '@/lib/tvDisplay';
import { useAndroidIcon } from '@/lib/useAndroidIcon';
import { useInsets } from '@/lib/useInsets';

/**
 * The Versus TVs that are on and show the group; picking one opens its remote (`tv`), + adds
 * one with the code it shows (`addTv`). Under them the group's cameras, whose video a TV can
 * show.
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
    const androidPlus = useAndroidIcon('plus', t.text);
    const plusIcon = Platform.OS === 'ios' ? 'plus' : androidPlus;

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
            {plusIcon && (
                <Stack.Toolbar placement="right">
                    <Stack.Toolbar.Button
                        icon={plusIcon}
                        accessibilityLabel="Add TV"
                        onPress={() => nav.navigate('addTv')}
                    />
                </Stack.Toolbar>
            )}
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
                        description={
                            <View style={{ alignItems: 'center', gap: 20 }}>
                                <Hint>
                                    A TV shows up here while it&apos;s on. Add
                                    one with the code it shows.
                                </Hint>
                                <Button
                                    title="Add TV"
                                    variant="primary"
                                    onPress={() => nav.navigate('addTv')}
                                />
                            </View>
                        }
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
                                icon="television"
                                name={tv.name}
                                caption={showing(tv)}
                                onPress={() =>
                                    nav.navigate('tv', { id: tv.id })
                                }
                            />
                        ))}
                    </>
                )}
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
        <View style={{ marginTop: 16 }}>
            <Section title="Cameras">
                <Hint>
                    A laptop or phone at the table films it, and a TV shows the
                    video with the score over it: choose Camera on the TV.
                </Hint>
                {cameras.map((camera) => (
                    <TvRow
                        key={camera.id}
                        icon="video-outline"
                        name={camera.name}
                        caption="On"
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
                <RemoteButton
                    title="Add Camera"
                    onPress={() => nav.navigate('addTv', { kind: 'camera' })}
                />
            </Section>
        </View>
    );
}

function TvRow({
    icon,
    name,
    caption,
    onPress,
}: {
    icon: IconName;
    name: string;
    caption: string;
    onPress: () => void;
}) {
    const t = useRemoteTokens();
    const reducedMotion = useReducedMotion();

    return (
        <PressableScale
            {...pressFeedback(reducedMotion)}
            onPress={onPress}
            accessibilityRole="button"
            accessibilityLabel={`${name}, ${caption}`}
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
                <Icon name={icon} size={26} color={t.accent} />
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
                        {caption}
                    </Text>
                </View>
            </View>
            <Icon name="chevron-right" size={24} color={t.textSecondary} />
        </PressableScale>
    );
}
