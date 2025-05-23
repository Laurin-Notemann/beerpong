import { useState } from 'react';
import { View } from 'react-native';

import { useNavigation } from '@/app/navigation/useNavigation';
import ConfirmationModal from '@/components/ConfirmationModal';
import MenuItem from '@/components/Menu/MenuItem';
import MenuSection, { MenuSectionProps } from '@/components/Menu/MenuSection';
import PillButton from '@/components/PillButton';
import Text from '@/components/Text';

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

    const stats = [pointsForScorer, pointsForTeam, finishingMove]
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
}

export interface AllowedMovesProps extends MenuSectionProps {
    moves: Move[];

    onNewPress: () => void;
    onDelete?: (id: string) => void;

    editable?: boolean;
}
export const AllowedMoves: React.FC<AllowedMovesProps> = ({
    moves,
    onNewPress,
    onDelete,
    editable = true,
    ...rest
}) => {
    const [modalId, setModalId] = useState<string | null>(null);

    const modalItem = moves.find((i) => i.id === modalId);

    const nav = useNavigation();

    return (
        <>
            <ConfirmationModal
                onClose={() => setModalId(null)}
                title={modalItem?.name!}
                description={modalItem ? formatStats(modalItem) : undefined}
                actions={[
                    {
                        title: 'Delete Move',
                        type: 'danger',

                        onPress: () => {
                            onDelete?.(modalId!);
                            setModalId(null);
                        },
                    },
                ]}
                isVisible={modalId != null}
            />
            <MenuSection
                title="Allowed Moves"
                titleTailIcon={
                    editable ? (
                        <PillButton
                            iconName="plus"
                            label="New"
                            onPress={onNewPress}
                            small
                        />
                    ) : undefined
                }
                {...rest}
            >
                {moves.length === 0 && (
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
                )}
                {moves.map((move) => {
                    return (
                        <MenuItem
                            title={move.name}
                            key={move.id}
                            subtitle={formatStats(move)}
                            tailIconType={editable ? 'next' : undefined}
                            onPress={
                                editable
                                    ? () =>
                                          nav.navigate('allowedMove', {
                                              id: move.id,
                                          })
                                    : undefined
                            }
                            headIcon="bullseye-arrow"
                        />
                    );
                })}
            </MenuSection>
        </>
    );
};
