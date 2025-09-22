import { useLocalSearchParams } from 'expo-router';

import AllowedMovesSwiper from '@/components/screens/AllowedMovesSwiper';
import { useNewSeasonDraft } from '@/zustand/utils/newSeasonDraftStore';

export default function Page() {
    const newSeasonDraft = useNewSeasonDraft();

    const { id } = useLocalSearchParams<{ id: string }>();

    return (
        <AllowedMovesSwiper
            allowedMoves={newSeasonDraft.newSeasonAllowedMoves}
            initialId={id}
        />
    );
}

