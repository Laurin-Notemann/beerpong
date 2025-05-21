import MenuSection from '@/components/Menu/MenuSection';

import MenuItem from './Menu/MenuItem';
import PillButton from './PillButton';

export interface AllowedMovesProps {
    moves: {
        id: string;
        name: string;
        pointsForScorer: number;
        pointsForTeam: number;
        finishingMove: boolean;
    }[];

    onNewPress: () => void;

    editable?: boolean;
}
export const AllowedMoves: React.FC<AllowedMovesProps> = ({
    moves,
    onNewPress,
    editable = true,
}) => {
    return (
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
            footer="The rules of the ongoing season cannot be changed. To change what moves can be played, start a new season."
        >
            {moves.map((move) => {
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

                const finishingMove = move.finishingMove
                    ? 'Finishing Move'
                    : null;

                const stats = [pointsForScorer, pointsForTeam, finishingMove]
                    .filter((i) => i != null)
                    .join(' ⸱ ');

                return (
                    <MenuItem
                        title={move.name}
                        key={move.id}
                        subtitle={stats}
                        tailIconType={editable ? 'next' : undefined}
                        onPress={editable ? () => {} : undefined}
                        headIcon="bullseye-arrow"
                    />
                );
            })}
        </MenuSection>
    );
};
