import { Pressable } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import Text from '../Text';

export interface SidebarGroup {
    id: string;
    name: string;
    playersCount: number;
    matchesCount: number;
}
export interface SidebarProps {
    activeGroupId?: string | null;

    groups: SidebarGroup[];

    appVersion: string;

    onOpenGroup: (groupId: string) => void;
}
export function Sidebar({
    groups,
    appVersion,
    activeGroupId,
    onOpenGroup,
}: SidebarProps) {
    return (
        <SafeAreaView
            style={{
                backgroundColor: '#1A1A1A',
                flex: 1,
                paddingHorizontal: 16,
            }}
        >
            {groups.map((i) => (
                <Pressable
                    onPress={() => onOpenGroup(i.id)}
                    key={i.id}
                    style={{
                        display: 'flex',

                        backgroundColor:
                            i.id === activeGroupId
                                ? 'rgba(0, 0, 0, 0.3)'
                                : undefined,

                        paddingHorizontal: 17,
                        paddingVertical: 12,
                    }}
                >
                    <Text
                        color="primary"
                        style={{
                            fontSize: 17,
                        }}
                    >
                        {i.name}
                    </Text>
                    <Text
                        color="secondary"
                        style={{
                            fontSize: 12,
                        }}
                    >
                        {i.playersCount} Players, {i.matchesCount} Matches
                    </Text>
                </Pressable>
            ))}
        </SafeAreaView>
    );
}
