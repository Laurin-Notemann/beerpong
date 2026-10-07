import { Pressable, Text, View } from 'react-native';

import { Icon } from '@/components/Icon';
import { useNavigation } from '@/lib/navigation/useNavigation';
import { TOURNAMENT_COLOR, TOURNAMENT_ICON } from '@/lib/tournament';

export function TournamentLabel({
    id,
    stage,
}: {
    id?: string | null;
    stage?: string | null;
}) {
    const nav = useNavigation();
    if (!id) return null;
    return (
        <Pressable
            accessibilityRole="button"
            accessibilityLabel={`Open tournament, ${stage ?? 'Tournament'}`}
            onPress={() => nav.navigate('tournament', { id })}
            style={{ minHeight: 44, justifyContent: 'center' }}
        >
            <View
                style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}
            >
                <Icon
                    name={TOURNAMENT_ICON}
                    size={16}
                    color={TOURNAMENT_COLOR}
                />
                <Text
                    numberOfLines={1}
                    style={{
                        color: TOURNAMENT_COLOR,
                        fontSize: 12,
                        fontWeight: '700',
                    }}
                >
                    {stage ?? 'Tournament'}
                </Text>
            </View>
        </Pressable>
    );
}
