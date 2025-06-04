import { NavigationProp } from '@react-navigation/native';
import { useNavigation as useRawNavigation } from 'expo-router';

export type RootStackParamList = {
    cropAvatar: { uri: string; profileId: string };
    index: undefined;
    formations: undefined;
    createGroupSetName: undefined;
    createGroupSetGame: undefined;
    editFormation: undefined;
    createGroup: undefined;
    joinGroup: undefined;
    pastSeasons: undefined;
    editPlayerName: { id: string };
    editGroupName: { id: string };
    createNewPlayer: undefined;
    onboarding: undefined;
    editRankPlayersBy: undefined;
    dailyLeaderboardSettings: undefined;
    teamSizeSettings: undefined;
    minMatchesToQualifySettings: undefined;
    saveSeason: undefined;
    startLiveMatch: undefined;
    player: { id: string };
    match: { id: string };
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
    debugLog: undefined;
    experimentalFeatures: undefined;

    createGroupCustomGameModal: undefined;

    rule: { id: string };

    assignPointsToPlayerModal: { pageIdx: number };
    assignCupHitModal: { x: number; y: number; color: string };
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
