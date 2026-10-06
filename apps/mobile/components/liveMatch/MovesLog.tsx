import React from 'react';
import { ScrollView, View } from 'react-native';

import Avatar from '@/components/Avatar';
import Text from '@/components/Text';
import type { namedMoveLog } from '@/lib/liveMatch/labels';
import { useInsets } from '@/lib/useInsets';
import { useTheme } from '@/theme';

/**
 * A live match's moves, newest first, like Versus TV's moves panel and the "Live matches" widget:
 * who scored, with which move, and the score right after it.
 */
export function MovesLog({
    entries,
}: {
    entries: ReturnType<typeof namedMoveLog>;
}) {
    const theme = useTheme();
    const insets = useInsets(true, true);

    return (
        <ScrollView
            style={{ flex: 1 }}
            contentContainerStyle={{
                paddingHorizontal: 16,
                paddingTop: insets.top + 16,
                paddingBottom: insets.bottom + 16,
            }}
        >
            {!entries.length && (
                <Text
                    variant="body1"
                    color="tertiary"
                    style={{ textAlign: 'center', marginTop: 32 }}
                >
                    No cups yet
                </Text>
            )}
            {entries.map((entry, idx) => (
                <View
                    key={entries.length - idx}
                    style={{
                        flexDirection: 'row',
                        alignItems: 'center',
                        gap: 12,
                        paddingVertical: 10,
                        paddingHorizontal: 12,
                        borderRadius: 12,
                        backgroundColor:
                            idx === 0 ? theme.panel.light.active : undefined,
                    }}
                >
                    <Avatar
                        url={entry.avatarUrl}
                        size={32}
                        name={entry.name}
                        borderColor={theme.color.team[entry.team]}
                        variant="list"
                    />
                    <Text
                        variant="body1"
                        numberOfLines={1}
                        style={{
                            flex: 1,
                            color: theme.color.team[entry.team],
                            fontWeight: '600',
                        }}
                    >
                        {entry.name}
                    </Text>
                    <Text
                        variant="body2"
                        color={idx === 0 ? 'primary' : 'secondary'}
                        numberOfLines={1}
                        style={{ flexShrink: 1 }}
                    >
                        {entry.move}
                    </Text>
                    <Text
                        variant="body1"
                        color="tertiary"
                        style={{
                            fontVariant: ['tabular-nums'],
                            minWidth: 48,
                            textAlign: 'right',
                        }}
                    >
                        <Text
                            variant="body1"
                            style={
                                entry.team === 'blue'
                                    ? { color: theme.color.team.blue }
                                    : undefined
                            }
                        >
                            {entry.blue}
                        </Text>
                        –
                        <Text
                            variant="body1"
                            style={
                                entry.team === 'red'
                                    ? { color: theme.color.team.red }
                                    : undefined
                            }
                        >
                            {entry.red}
                        </Text>
                    </Text>
                </View>
            ))}
        </ScrollView>
    );
}
