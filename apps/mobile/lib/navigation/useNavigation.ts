import { useNavigation as useRawNavigation } from 'expo-router';
import { NavigationProp } from 'expo-router/react-navigation';

import { RematchParams } from '@/lib/useOfferRematch';

export type RootStackParamList = {
    cropAvatar: { imageKey: string; profileId: string };
    index: undefined;
    formations: undefined;
    tournaments: undefined;
    createTournament: undefined;
    tournament: { id: string };
    createGroupSetName: undefined;
    createGroupSetGame: undefined;
    editFormation: { id?: string };
    createGroup: undefined;
    joinGroup: undefined;
    editPlayerName: { id: string };
    editGroupName: { id: string };
    createNewPlayer: undefined;
    onboarding: undefined;
    editRankPlayersBy: undefined;
    eloSettings: undefined;
    dailyLeaderboardSettings: undefined;
    teamSizeSettings: undefined;
    minMatchesToQualifySettings: undefined;
    tvRemote: undefined;
    tv: { id: string };
    tvCamera: { groupId: string };
    /** `kind: 'camera'` adds a camera instead */
    addTv: { kind?: 'camera' } | undefined;
    saveSeason: undefined;
    player: { id: string };
    /** `id` is the player's, `index` the clip to start on */
    scoreClips: { id: string; index: number };
    match: { id: string; seasonId: string };
    liveMatch: { id: string };
    liveMatches: undefined;
    liveMatchTeamsModal: { liveMatchId: string };
    matchPhotoModal: {
        matchId: string;
        seasonId: string;
    } & Partial<RematchParams>;
    matches: undefined;
    newMatch: undefined;

    localSettings: undefined;
    settings: undefined;
    allowedMoves: undefined;
    allowedMove: { id: string };
    defaultMoveSettings: undefined;

    'static/aboutTheEloAlgorithm': undefined;
    'static/privacyPolicy': undefined;
    'static/aboutPremium': undefined;
    'static/aboutUs': undefined;
    debug: undefined;
    debugLog: undefined;
    debugUpdates: undefined;
    debugSession: undefined;
    debugQueries: undefined;
    debugStorage: undefined;
    experimentalFeatures: undefined;

    createGroupCustomGameModal: undefined;

    rule: { id: string };

    assignPointsToPlayerModal: { pageIdx: number; liveMatchId?: string };
    assignCupHitModal: {
        team: 'red' | 'blue';
        x: number;
        y: number;
        rotated: boolean;
        liveMatchId?: string;
        /** optional preselected scorer and move */
        playerId?: string;
        moveId?: string;
    };
    editMatchPoints: { pageIdx: number };
    rerackModal: { liveMatchId?: string };
    createNewRule: undefined;
};
export type StackNavigation = NavigationProp<RootStackParamList>;

/**
 * re-exported from 'expo-router' with proper typing for our routes.
 *
 * new routes have to be manually added to the type definition of this function
 */
export const useNavigation = () => useRawNavigation<StackNavigation>();
