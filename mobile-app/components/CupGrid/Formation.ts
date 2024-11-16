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
export const flipFormation = (formation: FormationType): FormationType => {
    const highestY = formation.cups.sort((a, b) => b.y - a.y)[0]?.y;

    return {
        ...formation,
        cups: formation.cups.map((i) => ({ ...i, y: highestY - i.y })),
    };
};
