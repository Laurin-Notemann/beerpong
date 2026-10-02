import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import type { ComponentProps } from 'react';

/** The app's one icon set. Names: https://pictogrammers.com/library/mdi/ */
export const Icon = MaterialCommunityIcons;

export type IconName = ComponentProps<typeof MaterialCommunityIcons>['name'];
