import { ReactNativeZoomableView } from '@openspacelabs/react-native-zoomable-view';
import { useRef, useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import Svg, { Path } from 'react-native-svg';

import { Icon } from '@/components/Icon';
import { useNextTokens } from '@/components/next/tokens';
import {
    TOURNAMENT_COLOR,
    TOURNAMENT_ICON,
    strategyName,
    type TournamentFixture,
    type TournamentStage,
    type TournamentTeam,
} from '@/lib/tournament';

const CARD_WIDTH = 220,
    COLUMN = 264,
    CARD_HEIGHT = 112,
    GAP = 24,
    HEADER = 72;
const statusText = {
    BLOCKED: 'Waiting for previous stage',
    READY: 'Tap to start',
    IN_PROGRESS: 'Live · tap to open',
    FINISHED: 'Finished · tap to open',
    BYE: 'Bye · advances automatically',
};

export function BracketCanvas({
    stages,
    teams,
    onMatch,
    preview = false,
    canStart = true,
}: {
    stages: TournamentStage[];
    teams: TournamentTeam[];
    onMatch?: (fixture: TournamentFixture, stage: TournamentStage) => void;
    preview?: boolean;
    canStart?: boolean;
}) {
    const t = useNextTokens();
    const zoom = useRef<ReactNativeZoomableView>(null);
    const [reset, setReset] = useState(0);
    const maxRows = Math.max(1, ...stages.map((s) => s.matches.length));
    const height = HEADER + maxRows * (CARD_HEIGHT + GAP) + 40;
    const width = Math.max(COLUMN, stages.length * COLUMN);
    const y = (stage: TournamentStage, row: number) =>
        HEADER +
        ((height - HEADER - 40) / Math.max(1, stage.matches.length)) *
            (row + 0.5) -
        CARD_HEIGHT / 2;
    const label = (f: TournamentFixture) =>
        !canStart && f.status === 'READY' ? 'Not played' : statusText[f.status];
    const teamName = (id: string | null) =>
        id
            ? (teams.find((team) => team.id === id)?.name ?? 'Team')
            : 'To be decided';
    const lines = stages.flatMap((stage, col) => {
        const next = stages[col + 1];
        if (
            !next ||
            stage.strategy !== 'KNOCKOUT' ||
            next.strategy !== 'KNOCKOUT'
        )
            return [];
        return stage.matches.map((f, row) => {
            const target = Math.min(row, next.matches.length * 2 - 1 - row);
            const x1 = col * COLUMN + CARD_WIDTH,
                x2 = (col + 1) * COLUMN,
                from = y(stage, row) + CARD_HEIGHT / 2,
                to = y(next, Math.max(0, target)) + CARD_HEIGHT / 2;
            return (
                <Path
                    key={f.id}
                    d={`M ${x1} ${from} H ${x1 + 22} V ${to} H ${x2}`}
                    fill="none"
                    stroke={TOURNAMENT_COLOR}
                    strokeOpacity={0.35}
                    strokeWidth={2}
                />
            );
        });
    });
    return (
        <View
            style={{
                flex: 1,
                minHeight: 340,
                overflow: 'hidden',
                backgroundColor: t.isLight ? '#F5F3FF' : '#100B1C',
            }}
        >
            <ReactNativeZoomableView
                key={`${width}-${height}-${reset}`}
                ref={zoom}
                minZoom={0.15}
                maxZoom={2.5}
                initialZoom={0.85}
                initialOffsetX={width * 0.425 - 110}
                initialOffsetY={height * 0.425 - 150}
                contentWidth={width}
                contentHeight={height}
                bindToBorders
                style={{ flex: 1 }}
            >
                <View style={{ width, height }}>
                    <Svg
                        width={width}
                        height={height}
                        style={{ position: 'absolute' }}
                    >
                        {lines}
                    </Svg>
                    {stages.map((stage, col) => (
                        <View
                            key={`${col}-${stage.name}`}
                            style={{
                                position: 'absolute',
                                left: col * COLUMN,
                                top: 0,
                                width: CARD_WIDTH,
                                height,
                            }}
                        >
                            <View
                                style={{
                                    height: HEADER,
                                    justifyContent: 'center',
                                    gap: 4,
                                }}
                            >
                                <Text
                                    numberOfLines={1}
                                    style={{
                                        color: t.text,
                                        fontWeight: '800',
                                        fontSize: 17,
                                    }}
                                >
                                    {stage.name}
                                </Text>
                                <Text
                                    style={{
                                        color: TOURNAMENT_COLOR,
                                        fontSize: 12,
                                    }}
                                >
                                    {strategyName(stage.strategy)} ·{' '}
                                    {stage.advanceCount === 1
                                        ? '1 winner'
                                        : `${stage.advanceCount} advance`}
                                </Text>
                            </View>
                            {stage.matches.map((f, row) => (
                                <Pressable
                                    key={f.id}
                                    accessibilityRole="button"
                                    accessibilityLabel={`${stage.name}, ${teamName(f.blueTeamId)} versus ${teamName(f.redTeamId)}, ${label(f)}`}
                                    disabled={
                                        preview ||
                                        (!canStart && f.status === 'READY') ||
                                        f.status === 'BLOCKED' ||
                                        f.status === 'BYE'
                                    }
                                    onPress={() => onMatch?.(f, stage)}
                                    style={({ pressed }) => ({
                                        position: 'absolute',
                                        top: y(stage, row),
                                        width: CARD_WIDTH,
                                        height: CARD_HEIGHT,
                                        borderRadius: 16,
                                        padding: 12,
                                        gap: 7,
                                        backgroundColor: pressed
                                            ? t.surfacePressed
                                            : t.surface,
                                        borderWidth:
                                            f.status === 'IN_PROGRESS' ? 2 : 1,
                                        borderColor:
                                            f.status === 'IN_PROGRESS'
                                                ? TOURNAMENT_COLOR
                                                : t.hairline,
                                        transform: [
                                            { scale: pressed ? 0.96 : 1 },
                                        ],
                                    })}
                                >
                                    {(['blue', 'red'] as const).map((side) => (
                                        <View
                                            key={side}
                                            style={{
                                                flexDirection: 'row',
                                                alignItems: 'center',
                                                gap: 8,
                                            }}
                                        >
                                            <View
                                                style={{
                                                    width: 3,
                                                    height: 20,
                                                    borderRadius: 2,
                                                    backgroundColor: t[side],
                                                }}
                                            />
                                            <Text
                                                numberOfLines={1}
                                                style={{
                                                    flex: 1,
                                                    color: t.text,
                                                    fontSize: 13,
                                                    fontWeight:
                                                        f.winnerTeamId &&
                                                        f.winnerTeamId ===
                                                            f[`${side}TeamId`]
                                                            ? '800'
                                                            : '500',
                                                }}
                                            >
                                                {f.status === 'BYE' &&
                                                side === 'red'
                                                    ? 'Bye'
                                                    : teamName(
                                                          f[`${side}TeamId`]
                                                      )}
                                            </Text>
                                            {f.status === 'FINISHED' && (
                                                <Text
                                                    style={{
                                                        color: t.text,
                                                        fontWeight: '800',
                                                        fontVariant: [
                                                            'tabular-nums',
                                                        ],
                                                    }}
                                                >
                                                    {f[`${side}Score`]}
                                                </Text>
                                            )}
                                        </View>
                                    ))}
                                    <Text
                                        numberOfLines={1}
                                        style={{
                                            color:
                                                f.status === 'IN_PROGRESS' ||
                                                f.status === 'READY'
                                                    ? TOURNAMENT_COLOR
                                                    : t.textSecondary,
                                            fontSize: 11,
                                        }}
                                    >
                                        {preview
                                            ? f.status === 'BYE'
                                                ? 'Bye'
                                                : 'Scheduled game'
                                            : label(f)}
                                    </Text>
                                </Pressable>
                            ))}
                        </View>
                    ))}
                </View>
            </ReactNativeZoomableView>
            <View
                style={{
                    position: 'absolute',
                    right: 12,
                    bottom: 12,
                    flexDirection: 'row',
                    gap: 8,
                }}
            >
                {[-1, 1, 0].map((value) => (
                    <Pressable
                        key={value}
                        accessibilityRole="button"
                        accessibilityLabel={
                            value === 0
                                ? 'Reset bracket view'
                                : value < 0
                                  ? 'Zoom out'
                                  : 'Zoom in'
                        }
                        onPress={() => {
                            if (value === 0) setReset((value) => value + 1);
                            else void zoom.current?.zoomBy(value * 0.2);
                        }}
                        style={{
                            width: 44,
                            height: 44,
                            borderRadius: 14,
                            backgroundColor: t.surface,
                            alignItems: 'center',
                            justifyContent: 'center',
                        }}
                    >
                        <Icon
                            name={
                                value === 0
                                    ? 'fit-to-screen'
                                    : value < 0
                                      ? 'minus'
                                      : 'plus'
                            }
                            color={TOURNAMENT_COLOR}
                            size={22}
                        />
                    </Pressable>
                ))}
            </View>
            <View
                pointerEvents="none"
                style={{
                    position: 'absolute',
                    left: 12,
                    bottom: 18,
                    flexDirection: 'row',
                    gap: 6,
                    alignItems: 'center',
                }}
            >
                <Icon
                    name={TOURNAMENT_ICON}
                    size={16}
                    color={TOURNAMENT_COLOR}
                />
                <Text style={{ fontSize: 11, color: t.textSecondary }}>
                    Pan · pinch to zoom
                </Text>
            </View>
        </View>
    );
}
