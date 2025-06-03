import { Stack } from 'expo-router';
import {
    Dimensions,
    Image,
    ScrollView,
    TouchableHighlight,
    View,
} from 'react-native';

import { useNavigation } from '@/app/navigation/useNavigation';
import { HeaderItem } from '@/components/HeaderItem';
import Text from '@/components/Text';
import { useTheme } from '@/theme';
import { useCreateGroupStore } from '@/zustand/group/stateCreateGroupStore';

const paddingHorizontal = 16;
const gap = 12;
const numCols = 2;

export interface GameOption {
    id: string;
    title: string;

    icon?: string; // currently unused, but we might want to use icons for disciplines e.g. in the group list in the sidebar?
    imageUrl: string;
}

export const CreateGroupSetGame: React.FC<{
    games: GameOption[];
    onSubmit: (game: {
        preset?: string;
        custom?: {
            name: string;
        };
    }) => void;
    isPending?: boolean;
}> = ({ games, onSubmit, isPending = false }) => {
    const nav = useNavigation();

    const { sport, setSport } = useCreateGroupStore();

    const theme = useTheme();

    return (
        <ScrollView style={{ flex: 1, backgroundColor: theme.color.bg }}>
            <Stack.Screen
                options={{
                    headerRight: () => (
                        <HeaderItem
                            onPress={() => onSubmit(sport!)}
                            disabled={!sport}
                            isLoading={isPending}
                        >
                            Create
                        </HeaderItem>
                    ),

                    headerTitle: 'Create Group',
                    headerBackTitleVisible: false,
                    headerBackVisible: true,
                    headerTintColor: theme.color.text.primary,

                    headerStyle: {
                        backgroundColor: theme.color.topNav,
                    },
                    headerTitleStyle: {
                        color: theme.color.text.primary,
                    },
                }}
            />
            <Text
                color="secondary"
                style={{
                    textAlign: 'center',
                    marginBottom: 32,
                    paddingTop: 48,
                    paddingHorizontal,
                }}
            >
                What game would you like to track in this group?
            </Text>
            <View
                style={{
                    flexDirection: 'row',
                    flexWrap: 'wrap',

                    paddingHorizontal,
                    gap,
                }}
            >
                {games.map((game) => (
                    <Item
                        key={game.id}
                        title={game.title}
                        imageUrl={game.imageUrl}
                        onPress={() => setSport({ preset: game.id })}
                        selected={sport?.preset === game.id}
                    />
                ))}
                <Item
                    title={sport?.custom?.name || 'Other'}
                    onPress={() => {
                        setSport({
                            custom: { name: sport?.custom?.name ?? '' },
                        });
                        nav.navigate('createGroupCustomGameModal');
                    }}
                    selected={sport?.custom != null}
                />
            </View>
        </ScrollView>
    );
};

function Item({
    title,
    imageUrl,
    onPress,
    selected = false,
}: {
    title: string;
    imageUrl?: string;
    onPress: () => void;
    selected?: boolean;
}) {
    const SCREEN_WIDTH = Dimensions.get('window').width;

    const size = Math.floor(
        (SCREEN_WIDTH - paddingHorizontal * 2 - (gap * numCols - 1)) / numCols +
            5
    );
    const theme = useTheme();

    return (
        <TouchableHighlight
            style={[
                {
                    alignItems: 'center',
                    justifyContent: 'center',

                    width: size,
                    height: size,

                    borderRadius: 16, // ios app icon would be size / 4.5 and gap would be size / 2

                    backgroundColor: theme.panel.light.bg,

                    overflow: 'hidden',
                },
                selected && {
                    borderColor: theme.color.text.primary,
                    borderWidth: 2,
                },
            ]}
            underlayColor={theme.panel.light.dividers}
            onPress={onPress}
        >
            <>
                <View
                    style={{
                        position: 'absolute',
                        top: 0,
                        left: 0,
                        right: 0,
                        bottom: 0,

                        alignItems: 'center',
                        justifyContent: 'center',
                    }}
                >
                    <Image
                        source={{
                            uri: imageUrl,
                        }}
                        style={{
                            width: size,
                            height: size,
                            objectFit: 'cover',
                        }}
                    />
                    <View
                        style={{
                            position: 'absolute',
                            top: 0,
                            left: 0,
                            right: 0,
                            bottom: 0,
                            backgroundColor: 'rgba(0, 0, 0, 0.5)',
                        }}
                    />
                </View>
                <Text
                    color="primary"
                    style={{
                        fontSize: 24,
                        fontWeight: 'bold',

                        textAlign: 'center',

                        color: imageUrl ? '#fff' : theme.color.text.primary,
                    }}
                >
                    {title}
                </Text>
            </>
        </TouchableHighlight>
    );
}
