import { Pressable, Text, View } from 'react-native';

import { Icon } from '@/components/Icon';
import { useNextTokens } from '@/components/next/tokens';
import { useNavigation } from '@/lib/navigation/useNavigation';
import {
    TOURNAMENT_COLOR,
    TOURNAMENT_ICON,
    type Tournament,
} from '@/lib/tournament';

export const TOURNAMENT_BANNER_INSET = 60;
export function TournamentBanner({
    tournament,
    bottom,
}: {
    tournament: Tournament;
    bottom: number;
}) {
    const nav = useNavigation();
    const t = useNextTokens();
    const stage = tournament.stages.find((s) =>
        s.matches.some(
            (f) => f.status === 'READY' || f.status === 'IN_PROGRESS'
        )
    );
    return (
        <Pressable
            accessibilityRole="button"
            accessibilityLabel={`Open ${tournament.name} tournament bracket`}
            onPress={() => nav.navigate('tournament', { id: tournament.id })}
            style={({ pressed }) => ({
                position: 'absolute',
                left: 12,
                right: 12,
                bottom: bottom + 8,
                height: 52,
                paddingHorizontal: 14,
                borderRadius: 18,
                backgroundColor: t.isLight ? '#F3E8FF' : '#2B1743',
                flexDirection: 'row',
                alignItems: 'center',
                gap: 10,
                transform: [{ scale: pressed ? 0.96 : 1 }],
                shadowColor: '#000',
                shadowOffset: { width: 0, height: 4 },
                shadowOpacity: 0.12,
                shadowRadius: 12,
                elevation: 6,
            })}
        >
            <Icon name={TOURNAMENT_ICON} color={TOURNAMENT_COLOR} size={24} />
            <View style={{ flex: 1 }}>
                <Text
                    numberOfLines={1}
                    style={{ color: t.text, fontSize: 14, fontWeight: '700' }}
                >
                    {tournament.name}
                </Text>
                <Text
                    numberOfLines={1}
                    style={{ color: TOURNAMENT_COLOR, fontSize: 11 }}
                >
                    {stage?.name ?? 'Tournament in progress'}
                </Text>
            </View>
            <Icon name="chevron-right" color={TOURNAMENT_COLOR} size={22} />
        </Pressable>
    );
}
