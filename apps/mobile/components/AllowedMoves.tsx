import { View } from 'react-native';
import DraggableFlatList, {
    RenderItemParams,
} from 'react-native-draggable-flatlist';

import MenuItem from '@/components/Menu/MenuItem';
import MenuSection, { MenuSectionProps } from '@/components/Menu/MenuSection';
import PillButton from '@/components/PillButton';
import Text from '@/components/Text';
import { triggerHapticBump } from '@/haptics';
import { useNavigation } from '@/lib/navigation/useNavigation';

const formatStats = (move: Move): string => {
    const pointsForScorer = move.pointsForScorer
        ? move.pointsForScorer +
          (move.pointsForScorer > 1 ? ' Points' : ' Point') +
          ' for Scorer'
        : null;

    const pointsForTeam = move.pointsForTeam
        ? move.pointsForTeam +
          (move.pointsForTeam > 1 ? ' Points' : ' Point') +
          ' for Team'
        : null;

    const finishingMove = move.finishingMove ? 'Finishing Move' : null;

    const cups =
        move.cups == null
            ? null
            : move.cups === 1
              ? '1 Cup'
              : `${move.cups} Cups`;

    const stats = [pointsForScorer, pointsForTeam, cups, finishingMove]
        .filter((i) => i != null)
        .join(' ⸱ ');

    return stats;
};

interface Move {
    id: string;
    name: string;
    pointsForScorer: number;
    pointsForTeam: number;
    finishingMove: boolean;
    cups: number;
}

export interface AllowedMovesProps extends MenuSectionProps {
    moves: Move[];

    onNewPress: () => void;
    onDelete?: (id: string) => void;
    onReorder?: (moves: Move[]) => void;

    editable?: boolean;
}
export const AllowedMoves: React.FC<AllowedMovesProps> = ({
    moves,
    onNewPress,
    onDelete,
    onReorder,
    editable = true,
    ...rest
}) => {
    const nav = useNavigation();

    const renderItem = ({
        item,
        drag,
        isActive,
        getIndex,
    }: RenderItemParams<Move>) => {
        return (
            <MenuItem
                border={getIndex() !== 0}
                title={item.name}
                key={item.id}
                subtitle={formatStats(item)}
                onPress={
                    editable
                        ? () =>
                              nav.navigate('allowedMove', {
                                  id: item.id,
                              })
                        : undefined
                }
                headIcon="bullseye-arrow"
                onDrag={editable ? drag : undefined}
            />
        );
    };

    return (
        <>
            <MenuSection
                title="Allowed Moves"
                titleTailIcon={
                    editable ? (
                        <PillButton
                            iconName="plus"
                            label="New"
                            onPress={onNewPress}
                        />
                    ) : undefined
                }
                {...rest}
            >
                <DraggableFlatList
                    data={moves}
                    renderItem={renderItem}
                    keyExtractor={(item) => item.id}
                    onDragEnd={({ data }) => {
                        triggerHapticBump('selection');
                        onReorder?.(data);
                    }}
                    ListEmptyComponent={
                        <View
                            style={{
                                height: 62,
                                width: '100%',
                                alignItems: 'center',
                                justifyContent: 'center',
                            }}
                        >
                            <Text
                                color="secondary"
                                style={{
                                    textAlign: 'center',
                                }}
                            >
                                No moves defined
                            </Text>
                        </View>
                    }
                />
            </MenuSection>
        </>
    );
};
