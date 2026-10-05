import { useRouter } from 'expo-router';
import { useIsFocused } from 'expo-router/react-navigation';
import { useEffect, useMemo, useRef, useState } from 'react';

import {
    GroupLiveMatch,
    useGroupLiveMatches,
} from '@/api/liveMatch/useGroupLiveMatches';
import { useNavigation } from '@/lib/navigation/useNavigation';
import { useSelectedGroupId } from '@/zustand/group/stateGroupStore';
import { liveMatchOutbox } from '@/zustand/liveMatchOutboxStore';
import { useLocalSettingsStore } from '@/zustand/localSettingsStore';

/** what the dock shows: the primary match, and how many are live in the group */
export interface LiveMatchDockSnapshot {
    groupId: string;
    primary: GroupLiveMatch;
    count: number;
}

/**
 * The live match dock's data. It shows (`snapshot` is set) in pro mode while the selected group
 * has a live match. Tapping it opens the match it shows; with several live, its "+N" opens the
 * list, where you pick the match the dock shows. `enabled`
 * is false where this platform doesn't show the dock (the tab bar's accessory or the tab
 * stacks' floating one), so it's computed only once.
 */
export function useLiveMatchDock({ enabled }: { enabled: boolean }) {
    const groupId = useSelectedGroupId();
    const proMode = useLocalSettingsStore((s) => s.beerpongProMode);
    // out of pro mode the dock is hidden, so nothing needs fetching
    const { matches, primary } = useGroupLiveMatches(
        enabled && proMode ? groupId : null
    );
    const nav = useNavigation();

    const count = matches.length;
    const snapshot = useMemo<LiveMatchDockSnapshot | undefined>(
        () => (groupId && primary ? { groupId, primary, count } : undefined),
        [groupId, primary, count]
    );

    function open() {
        if (snapshot) nav.navigate('liveMatch', { id: snapshot.primary.id });
    }

    function openList() {
        if (snapshot) nav.navigate('liveMatches');
    }

    return { snapshot, open, openList };
}

/**
 * The live matches sheet: the group's live matches, to pick the one the dock shows. It closes
 * itself once none are left.
 */
export function useLiveMatchesSheet() {
    const router = useRouter();
    const groupId = useSelectedGroupId();
    const { matches, primary } = useGroupLiveMatches(groupId);
    const isFocused = useIsFocused();
    const isClosing = useRef(false);

    function close() {
        if (isClosing.current) return;
        isClosing.current = true;
        router.back();
    }

    // everything ended while the sheet was open (or the group switched)
    useEffect(() => {
        if (!matches.length && isFocused) close();
    });

    return {
        groupId,
        matches,
        shownId: primary?.id,
        /** the dock shows this match from now on */
        show(id: string) {
            if (isClosing.current || !groupId) return;
            liveMatchOutbox().actions.setLastOpened(groupId, id);
            close();
        },
    };
}

/**
 * `value`, and for `ms` after it went away the last value it had. Lets a dock that hides with a
 * native animation keep its content until it's out of sight.
 */
export function useLingering<T>(value: T | undefined, ms: number) {
    const [last, setLast] = useState(value);
    if (value !== undefined && value !== last) setLast(value);

    useEffect(() => {
        if (value !== undefined) return;
        const timer = setTimeout(() => setLast(undefined), ms);
        return () => clearTimeout(timer);
    }, [value, ms]);

    return value ?? last;
}
