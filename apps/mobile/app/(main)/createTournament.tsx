import { uuid } from 'expo';
import { Stack } from 'expo-router';
import { useMemo, useState } from 'react';
import {
    Alert,
    Pressable,
    ScrollView,
    Text,
    TextInput,
    View,
} from 'react-native';

import { usePlayersQuery } from '@/api/calls/playerHooks';
import { useGroup } from '@/api/calls/seasonHooks';
import {
    useCreateTournament,
    useTournaments,
} from '@/api/calls/tournamentHooks';
import { Icon } from '@/components/Icon';
import { useNextTokens } from '@/components/next/tokens';
import { BracketCanvas } from '@/components/tournament/BracketCanvas';
import { useNavStyles } from '@/lib/navigation/navStyles';
import { useNavigation } from '@/lib/navigation/useNavigation';
import {
    changeStage,
    knockoutPlan,
    previewStages,
    strategiesFor,
    strategyName,
    TOURNAMENT_COLOR,
    TOURNAMENT_ICON,
    type StagePlan,
} from '@/lib/tournament';
import { useInsets } from '@/lib/useInsets';

export default function CreateTournament() {
    const { groupId, seasonId, activeSeason } = useGroup();
    const playersData = usePlayersQuery(groupId, seasonId).data?.data;
    const players = useMemo(() => playersData ?? [], [playersData]);
    const existing = useTournaments(groupId).data?.find(
        (t) => t.status === 'ACTIVE'
    );
    const create = useCreateTournament(groupId);
    const nav = useNavigation();
    const navStyles = useNavStyles();
    const t = useNextTokens();
    const insets = useInsets(true);
    const [id] = useState(() => uuid.v4());
    const [name, setName] = useState('');
    const [teamSize, setTeamSize] = useState(
        activeSeason?.seasonSettings?.minTeamSize ?? 1
    );
    const [participants, setParticipants] = useState<string[]>([]);
    const [teamNames, setTeamNames] = useState<Record<number, string>>({});
    const [plan, setPlan] = useState<StagePlan[]>([]);
    const [plannedCount, setPlannedCount] = useState(0);
    const [showBracket, setShowBracket] = useState(false);
    const count = Math.floor(participants.length / teamSize);
    if (count !== plannedCount) {
        setPlannedCount(count);
        setPlan(knockoutPlan(count));
    }
    const teams = useMemo(
        () =>
            Array.from({ length: count }, (_, i) => ({
                id: `team-${i}`,
                name:
                    teamNames[i] ??
                    participants
                        .slice(i * teamSize, (i + 1) * teamSize)
                        .map(
                            (id) =>
                                players.find((p) => p.id === id)?.profile
                                    ?.name ?? 'Player'
                        )
                        .join(' & '),
                playerIds: participants.slice(i * teamSize, (i + 1) * teamSize),
            })),
        [count, teamSize, participants, teamNames, players]
    );
    const stages = useMemo(() => previewStages(teams, plan), [teams, plan]);
    const sizes = Array.from(
        {
            length:
                (activeSeason?.seasonSettings?.maxTeamSize ?? 10) -
                (activeSeason?.seasonSettings?.minTeamSize ?? 1) +
                1,
        },
        (_, i) => i + (activeSeason?.seasonSettings?.minTeamSize ?? 1)
    );
    const valid =
        name.trim().length >= 2 &&
        name.trim().length <= 80 &&
        count >= 2 &&
        count <= 32 &&
        participants.length % teamSize === 0 &&
        plan.length > 0 &&
        plan.every((s) => s.name.trim().length >= 2) &&
        (!existing || existing.id === id);
    const start = async () => {
        if (!valid || !seasonId) return;
        try {
            const tournament = await create.mutateAsync({
                id,
                body: {
                    name: name.trim(),
                    seasonId,
                    teamSize,
                    teams: teams.map(({ name, playerIds }) => ({
                        name,
                        playerIds,
                    })),
                    stages: plan,
                },
            });
            nav.goBack();
            nav.navigate('tournament', { id: tournament.id });
        } catch {
            /* mutation reports the error */
        }
    };
    const input = {
        color: t.text,
        fontSize: 16,
        minHeight: 48,
        paddingHorizontal: 12,
        borderRadius: 12,
        backgroundColor: t.surface,
    };
    const heading = { color: t.text, fontSize: 18, fontWeight: '700' as const };
    const chip = (selected: boolean) => ({
        minHeight: 44,
        paddingHorizontal: 14,
        justifyContent: 'center' as const,
        borderRadius: 12,
        backgroundColor: selected ? TOURNAMENT_COLOR : t.surface,
    });
    return (
        <View
            style={{
                flex: 1,
                backgroundColor: t.isLight ? '#F5F3FF' : '#100B1C',
            }}
        >
            <Stack.Screen
                options={{
                    ...navStyles,
                    title: showBracket ? 'Bracket preview' : 'Start tournament',
                }}
            />
            <Stack.Toolbar placement="right">
                <Stack.Toolbar.Button
                    disabled={!valid || create.isPending}
                    variant="done"
                    onPress={() =>
                        Alert.alert(
                            'Start tournament?',
                            `${name.trim()} · ${count} teams · ${plan.length} stages. Teams and stages are fixed once it starts.`,
                            [
                                { text: 'Cancel', style: 'cancel' },
                                { text: 'Start', onPress: () => void start() },
                            ]
                        )
                    }
                >
                    Start
                </Stack.Toolbar.Button>
            </Stack.Toolbar>
            {showBracket ? (
                <View
                    style={{
                        flex: 1,
                        paddingTop: insets.top,
                        paddingBottom: insets.bottom,
                    }}
                >
                    <Pressable
                        onPress={() => setShowBracket(false)}
                        style={{ minHeight: 44, padding: 12 }}
                    >
                        <Text style={{ color: TOURNAMENT_COLOR }}>
                            Back to editor
                        </Text>
                    </Pressable>
                    <BracketCanvas stages={stages} teams={teams} preview />
                </View>
            ) : (
                <ScrollView
                    keyboardShouldPersistTaps="handled"
                    keyboardDismissMode="on-drag"
                    contentContainerStyle={{
                        paddingTop: insets.top + 16,
                        paddingBottom: insets.bottom + 24,
                        paddingHorizontal: 16,
                        gap: 20,
                    }}
                >
                    <View
                        style={{
                            flexDirection: 'row',
                            gap: 12,
                            alignItems: 'center',
                        }}
                    >
                        <Icon
                            name={TOURNAMENT_ICON}
                            color={TOURNAMENT_COLOR}
                            size={32}
                        />
                        <View style={{ flex: 1 }}>
                            <Text style={heading}>
                                One group. One champion.
                            </Text>
                            <Text
                                style={{ color: t.textSecondary, marginTop: 4 }}
                            >
                                Build your teams and choose the path to the
                                final.
                            </Text>
                        </View>
                    </View>
                    {existing && (
                        <Text style={{ color: TOURNAMENT_COLOR }}>
                            Finish or cancel {existing.name} before starting
                            another tournament.
                        </Text>
                    )}
                    <View style={{ gap: 8 }}>
                        <Text style={heading}>Tournament name</Text>
                        <TextInput
                            returnKeyType="done"
                            submitBehavior="blurAndSubmit"
                            accessibilityLabel="Tournament name"
                            placeholder="Summer Cup"
                            placeholderTextColor={t.textSecondary}
                            value={name}
                            onChangeText={setName}
                            maxLength={80}
                            style={input}
                        />
                    </View>
                    <View style={{ gap: 8 }}>
                        <Text style={heading}>Team size</Text>
                        <View
                            style={{
                                flexDirection: 'row',
                                flexWrap: 'wrap',
                                gap: 8,
                            }}
                        >
                            {sizes.map((size) => (
                                <Pressable
                                    key={size}
                                    accessibilityRole="button"
                                    accessibilityLabel={`${size} ${size === 1 ? 'player' : 'players'} per team`}
                                    onPress={() => setTeamSize(size)}
                                    style={chip(size === teamSize)}
                                >
                                    <Text
                                        style={{
                                            color:
                                                size === teamSize
                                                    ? '#fff'
                                                    : t.text,
                                        }}
                                    >
                                        {size}
                                    </Text>
                                </Pressable>
                            ))}
                        </View>
                    </View>
                    <View style={{ gap: 8 }}>
                        <Text style={heading}>
                            Participants · {participants.length}
                        </Text>
                        <Text style={{ color: t.textSecondary }}>
                            Select players in team order. Each{' '}
                            {teamSize === 1 ? 'player' : `${teamSize} players`}{' '}
                            {teamSize === 1 ? 'forms' : 'form'} a team.
                        </Text>
                        <View
                            style={{
                                flexDirection: 'row',
                                flexWrap: 'wrap',
                                gap: 8,
                            }}
                        >
                            {players
                                .filter((p) => p.activeThisSeason !== false)
                                .map((p) => {
                                    const at = participants.indexOf(p.id);
                                    return (
                                        <Pressable
                                            key={p.id}
                                            accessibilityRole="checkbox"
                                            accessibilityState={{
                                                checked: at >= 0,
                                            }}
                                            onPress={() =>
                                                setParticipants((prev) =>
                                                    prev.includes(p.id)
                                                        ? prev.filter(
                                                              (id) =>
                                                                  id !== p.id
                                                          )
                                                        : [...prev, p.id]
                                                )
                                            }
                                            style={chip(at >= 0)}
                                        >
                                            <Text
                                                style={{
                                                    color:
                                                        at >= 0
                                                            ? '#fff'
                                                            : t.text,
                                                }}
                                            >
                                                {p.profile?.name ?? 'Player'}
                                                {at >= 0
                                                    ? ` · Team ${Math.floor(at / teamSize) + 1}`
                                                    : ''}
                                            </Text>
                                        </Pressable>
                                    );
                                })}
                        </View>
                        <Pressable
                            onPress={() => {
                                setParticipants(
                                    players
                                        .filter(
                                            (p) => p.activeThisSeason !== false
                                        )
                                        .map((p) => p.id)
                                );
                                setTeamNames({});
                            }}
                            style={{ minHeight: 44, justifyContent: 'center' }}
                        >
                            <Text style={{ color: TOURNAMENT_COLOR }}>
                                Select all participants
                            </Text>
                        </Pressable>
                        {participants.length % teamSize !== 0 && (
                            <Text style={{ color: t.textSecondary }}>
                                Select{' '}
                                {teamSize - (participants.length % teamSize)}{' '}
                                more players to complete the last team.
                            </Text>
                        )}
                        {count > 32 && (
                            <Text style={{ color: t.textSecondary }}>
                                A tournament supports up to 32 teams.
                            </Text>
                        )}
                    </View>
                    {teams.length > 0 && (
                        <View style={{ gap: 8 }}>
                            <View
                                style={{
                                    flexDirection: 'row',
                                    justifyContent: 'space-between',
                                    alignItems: 'center',
                                }}
                            >
                                <Text style={heading}>
                                    Teams · {teams.length}
                                </Text>
                                <Pressable
                                    accessibilityRole="button"
                                    onPress={() => {
                                        setParticipants((prev) => {
                                            const next = [...prev];
                                            for (
                                                let i = next.length - 1;
                                                i > 0;
                                                i--
                                            ) {
                                                const j = Math.floor(
                                                    Math.random() * (i + 1)
                                                );
                                                [next[i], next[j]] = [
                                                    next[j],
                                                    next[i],
                                                ];
                                            }
                                            return next;
                                        });
                                        setTeamNames({});
                                    }}
                                    style={{
                                        minHeight: 44,
                                        justifyContent: 'center',
                                    }}
                                >
                                    <Text style={{ color: TOURNAMENT_COLOR }}>
                                        Shuffle teams
                                    </Text>
                                </Pressable>
                            </View>
                            {teams.map((team, i) => (
                                <View key={team.id} style={{ gap: 4 }}>
                                    <TextInput
                                        returnKeyType="done"
                                        submitBehavior="blurAndSubmit"
                                        accessibilityLabel={`Team ${i + 1} name`}
                                        value={team.name}
                                        onChangeText={(value) =>
                                            setTeamNames((prev) => ({
                                                ...prev,
                                                [i]: value,
                                            }))
                                        }
                                        maxLength={80}
                                        style={input}
                                    />
                                    <Text
                                        style={{
                                            color: t.textSecondary,
                                            paddingHorizontal: 12,
                                        }}
                                    >
                                        {team.playerIds
                                            .map(
                                                (id) =>
                                                    players.find(
                                                        (p) => p.id === id
                                                    )?.profile?.name
                                            )
                                            .join(' · ')}
                                    </Text>
                                </View>
                            ))}
                        </View>
                    )}
                    {count >= 2 && count <= 32 && (
                        <View style={{ gap: 16 }}>
                            <Text style={heading}>Stages</Text>
                            {plan.map((stage, index) => {
                                const field =
                                    index === 0
                                        ? count
                                        : plan[index - 1].advanceCount;
                                return (
                                    <View key={index} style={{ gap: 8 }}>
                                        <TextInput
                                            returnKeyType="done"
                                            submitBehavior="blurAndSubmit"
                                            accessibilityLabel={`Stage ${index + 1} name`}
                                            value={stage.name}
                                            maxLength={80}
                                            onChangeText={(name) =>
                                                setPlan((prev) =>
                                                    prev.map((s, i) =>
                                                        i === index
                                                            ? { ...s, name }
                                                            : s
                                                    )
                                                )
                                            }
                                            style={input}
                                        />
                                        <Text
                                            style={{ color: t.textSecondary }}
                                        >
                                            {field} teams ·{' '}
                                            {strategyName(stage.strategy)}
                                        </Text>
                                        <View
                                            style={{
                                                flexDirection: 'row',
                                                gap: 8,
                                            }}
                                        >
                                            {strategiesFor(field).map(
                                                (option) => (
                                                    <Pressable
                                                        key={option.strategy}
                                                        accessibilityRole="button"
                                                        accessibilityLabel={`${option.name} for stage ${index + 1}`}
                                                        onPress={() =>
                                                            setPlan((prev) =>
                                                                changeStage(
                                                                    prev,
                                                                    index,
                                                                    field,
                                                                    option.strategy
                                                                )
                                                            )
                                                        }
                                                        style={[
                                                            chip(
                                                                stage.strategy ===
                                                                    option.strategy
                                                            ),
                                                            {
                                                                flex: 1,
                                                                paddingVertical: 10,
                                                            },
                                                        ]}
                                                    >
                                                        <Text
                                                            style={{
                                                                color:
                                                                    stage.strategy ===
                                                                    option.strategy
                                                                        ? '#fff'
                                                                        : t.text,
                                                                fontWeight:
                                                                    '700',
                                                            }}
                                                        >
                                                            {option.name}
                                                        </Text>
                                                        <Text
                                                            style={{
                                                                color:
                                                                    stage.strategy ===
                                                                    option.strategy
                                                                        ? '#fff'
                                                                        : t.textSecondary,
                                                                fontSize: 11,
                                                                marginTop: 4,
                                                            }}
                                                        >
                                                            {option.description}
                                                        </Text>
                                                    </Pressable>
                                                )
                                            )}
                                        </View>
                                        {stage.strategy === 'ROUND_ROBIN' && (
                                            <View style={{ gap: 8 }}>
                                                <Text
                                                    style={{
                                                        color: t.textSecondary,
                                                    }}
                                                >
                                                    Teams advancing
                                                </Text>
                                                <View
                                                    style={{
                                                        flexDirection: 'row',
                                                        flexWrap: 'wrap',
                                                        gap: 8,
                                                    }}
                                                >
                                                    {Array.from(
                                                        { length: field - 1 },
                                                        (_, i) => i + 1
                                                    ).map((n) => (
                                                        <Pressable
                                                            key={n}
                                                            onPress={() =>
                                                                setPlan(
                                                                    (prev) =>
                                                                        changeStage(
                                                                            prev,
                                                                            index,
                                                                            field,
                                                                            'ROUND_ROBIN',
                                                                            n
                                                                        )
                                                                )
                                                            }
                                                            style={chip(
                                                                n ===
                                                                    stage.advanceCount
                                                            )}
                                                        >
                                                            <Text
                                                                style={{
                                                                    color:
                                                                        n ===
                                                                        stage.advanceCount
                                                                            ? '#fff'
                                                                            : t.text,
                                                                }}
                                                            >
                                                                {n}
                                                            </Text>
                                                        </Pressable>
                                                    ))}
                                                </View>
                                                <Text
                                                    style={{
                                                        color: t.textSecondary,
                                                        fontSize: 12,
                                                    }}
                                                >
                                                    Ranked by wins, point
                                                    difference, then points
                                                    scored. Exact ties use the
                                                    original team order.
                                                </Text>
                                            </View>
                                        )}
                                    </View>
                                );
                            })}
                            <Pressable
                                accessibilityRole="button"
                                onPress={() => setShowBracket(true)}
                                style={[chip(true), { alignItems: 'center' }]}
                            >
                                <Text
                                    style={{ color: '#fff', fontWeight: '700' }}
                                >
                                    Open bracket editor
                                </Text>
                            </Pressable>
                        </View>
                    )}
                </ScrollView>
            )}
        </View>
    );
}
