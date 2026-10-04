import { useNavigation as useRawNavigation } from 'expo-router';
import { NavigationProp } from 'expo-router/react-navigation';

export type RootStackParamList = {
    cropAvatar: { imageKey: string; profileId: string };
    index: undefined;
    formations: undefined;
    createGroupSetName: undefined;
    createGroupSetGame: undefined;
    editFormation: undefined;
    createGroup: undefined;
    joinGroup: undefined;
    editPlayerName: { id: string };
    editGroupName: { id: string };
    createNewPlayer: undefined;
    onboarding: undefined;
    editRankPlayersBy: undefined;
    dailyLeaderboardSettings: undefined;
    teamSizeSettings: undefined;
    minMatchesToQualifySettings: undefined;
    saveSeason: undefined;
    player: { id: string };
    match: { id: string; seasonId: string };
    liveMatch: { id: string };
    matches: undefined;
    editFormationName: undefined;
    newMatch: undefined;

    localSettings: undefined;
    settings: undefined;
    allowedMoves: undefined;
    allowedMove: { id: string };

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
    };
    editMatchPoints: { pageIdx: number };
    createNewRule: undefined;
};
export type StackNavigation = NavigationProp<RootStackParamList>;

/**
 * re-exported from 'expo-router' with proper typing for our routes.
 *
 * new routes have to be manually added to the type definition of this function
 */
export const useNavigation = () => useRawNavigation<StackNavigation>();
