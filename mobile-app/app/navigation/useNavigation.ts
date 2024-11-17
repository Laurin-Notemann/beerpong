import { NavigationProp } from '@react-navigation/native';
import { useNavigation as useRawNavigation } from 'expo-router';

export type ScreenName =
    | 'index'
    | 'formations'
    | 'createGroupSetName'
    | 'editFormation'
    | 'editFormation'
    | 'createGroup'
    | 'joinGroup'
    | 'pastSeasons'
    | 'editPlayerName'
    | 'newMatchPoints'
    | 'createNewPlayer'
    | 'aboutPremium'
    | 'onboarding'
    | 'editRankPlayersBy'
    | 'saveSeason'
    | 'startLiveMatch'
    | 'player'
    | 'match'
    | 'matches'
    | 'editFormationName';
export type RootStackParamList = Record<ScreenName, undefined>;
export type StackNavigation = NavigationProp<RootStackParamList>;

/**
 * re-exported from 'expo-router' with proper typing for our routes.
 *
 * new routes have to be manually added to the type definition of this function
 */
export const useNavigation = () => useRawNavigation<StackNavigation>();
