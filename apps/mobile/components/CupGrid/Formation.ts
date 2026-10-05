export type FormationCup = {
    x: number;
    y: number;
    disabled?: boolean;
    color?: string;
};

export type FormationType = {
    rows: number;
    columns: number;

    cups: FormationCup[];
};

export const Formation: Record<string, FormationType> = {
    Empty_10: {
        rows: 7,
        columns: 7,
        cups: [],
    },
    Pyramid_10: {
        rows: 7,
        columns: 7,
        cups: [
            { x: 0, y: 0 },
            { x: 2, y: 0 },
            { x: 4, y: 0 },
            { x: 6, y: 0 },

            { x: 1, y: 2 },
            { x: 3, y: 2 },
            { x: 5, y: 2 },

            { x: 2, y: 4 },
            { x: 4, y: 4 },

            { x: 3, y: 6 },
        ],
    },
};
/** Turns a cup position half a turn, for the team on the far side of the table. Applying it twice gives the position back. */
export const rotatePoint = <T extends { x: number; y: number }>(
    formation: Pick<FormationType, 'rows' | 'columns'>,
    cup: T
): T => ({
    ...cup,
    x: formation.columns - 1 - cup.x,
    y: formation.rows - 1 - cup.y,
});

export const rotateFormation = (formation: FormationType): FormationType => ({
    ...formation,
    cups: formation.cups.map((cup) => rotatePoint(formation, cup)),
});
