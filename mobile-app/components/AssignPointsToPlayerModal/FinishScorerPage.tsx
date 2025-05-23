import React from 'react';
import { ScrollView, View } from 'react-native';

import { TeamMember } from '@/api/utils/matchDtoToMatch';
import Avatar from '@/components/Avatar';
import Select from '@/components/Select';
import Text from '@/components/Text';
import { useScrollLockIfNotOverflowing } from '@/components/useScrollLockIfNotOverflowing';
import { theme } from '@/theme';

export default function FinishScorerPage({
    finisher,
    players,
    onSetFinisher,
}: {
    finisher?: TeamMember | null;
    players: TeamMember[];
    onSetFinisher: (player: TeamMember) => void;
}) {
    return (
        <View style={{ flex: 1, width: '100%' }}>
            <View
                style={{
                    alignItems: 'center',

                    flex: 1,

                    paddingTop: 32,
                }}
            >
                <Text
                    color="primary"
                    variant="h3"
                    style={{ paddingHorizontal: 16, textAlign: 'center' }}
                >
                    Who scored the final cup?
                </Text>
                <ScrollView
                    {...useScrollLockIfNotOverflowing()}
                    style={{
                        width: '100%',
                    }}
                    contentContainerStyle={{
                        paddingHorizontal: 16,
                        paddingTop: 96,
                        paddingBottom: 32,
                    }}
                >
                    <Select
                        items={players.map((i) => ({
                            value: i.id,
                            title: i.name,
                            headIcon: (
                                <Avatar
                                    url={i.avatarUrl}
                                    size={36}
                                    name={i.name}
                                    borderColor={
                                        i.team
                                            ? theme.color.team[i.team]
                                            : undefined
                                    }
                                    style={{
                                        marginRight: 8,
                                    }}
                                />
                            ),
                        }))}
                        onChange={(playerId) =>
                            onSetFinisher(
                                players.find((i) => i.id === playerId)!
                            )
                        }
                        value={finisher?.id}
                    />
                </ScrollView>
            </View>
        </View>
    );
}
