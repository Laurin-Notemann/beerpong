import { NavigationProp } from '@react-navigation/native';
import { useNavigation as useRawNavigation } from 'expo-router';

export type RootStackParamList = {
    index: undefined;
    formations: undefined;
    createGroupSetName: undefined;
    editFormation: undefined;
    createGroup: undefined;
    joinGroup: undefined;
    pastSeasons: undefined;
    editPlayerName: { id: string };
    editGroupName: { id: string };
    newMatchPoints: undefined;
    createNewPlayer: undefined;
    aboutPremium: undefined;
    onboarding: undefined;
    editRankPlayersBy: undefined;
    saveSeason: undefined;
    startLiveMatch: undefined;
    player: { id: string };
    match: { id: string };
    matches: undefined;
    editFormationName: undefined;
    newMatch: undefined;
};
export type StackNavigation = NavigationProp<RootStackParamList>;

/**
 * re-exported from 'expo-router' with proper typing for our routes.
 *
 * new routes have to be manually added to the type definition of this function
 */
export const useNavigation = () => useRawNavigation<StackNavigation>();
