import { Pressable } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useGroupQuery } from '@/api/calls/group/groupHooks';
import { useNavigation } from '@/app/navigation/useNavigation';
import { useGroupStore } from '@/zustand/group/stateGroupStore';

import Button from '../Button';
import Text from '../Text';

export interface SidebarGroupItemProps {
    id: string;
    isActive: boolean;
    onPress: (id: string) => void;
}

export function SidebarGroupItem({
    id,
    isActive,
    onPress,
}: SidebarGroupItemProps) {
    const { data } = useGroupQuery(id);

    return (
        <Pressable
            onPress={() => onPress(id)}
            style={{
                display: 'flex',
                backgroundColor: isActive ? 'rgba(0, 0, 0, 0.3)' : undefined,
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
                {data?.data?.name ?? 'Loading...'}
            </Text>
            <Text
                color="secondary"
                style={{
                    fontSize: 12,
                }}
            >
                {11} Players, {11} Matches
            </Text>
        </Pressable>
    );
}

export interface SidebarGroup {
    id: string;
    name: string;
    playersCount: number;
    matchesCount: number;
}

export interface SidebarProps {
    appVersion: string;
}

export function Sidebar({ appVersion }: SidebarProps) {
    const { groupIds, selectedGroupId, selectGroup, clearGroups } =
        useGroupStore();

    const nav = useNavigation();

    return (
        <SafeAreaView
            style={{
                backgroundColor: '#1A1A1A',
                flex: 1,
                paddingHorizontal: 16,
            }}
        >
            <Button title="clear" onPress={clearGroups} />
            <Button
                title="create new group"
                onPress={() => {
                    nav.navigate('createGroup');
                }}
            />
            <Button
                title="join group"
                onPress={() => {
                    nav.navigate('joinGroup');
                }}
            />
            {groupIds.map((id) => (
                <SidebarGroupItem
                    key={id}
                    id={id}
                    isActive={id === selectedGroupId}
                    onPress={() => selectGroup(id)}
                />
            ))}
        </SafeAreaView>
    );
}
