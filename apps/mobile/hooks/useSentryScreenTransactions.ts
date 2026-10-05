import { useNavigationContainerRef } from 'expo-router';
import { useEffect } from 'react';

import { Sentry } from '@/utils/sentry';

type NavState = {
    index?: number;
    routes: readonly { key?: string; name: string; state?: NavState }[];
};

/** The focused screen's route key, and its path without route groups: `/match`, `/`. */
function focusedScreen(state: NavState | undefined) {
    const segments: string[] = [];
    let key: string | undefined;
    for (let s = state; s;) {
        const route = s.routes[s.index ?? 0];
        if (!route) break;
        segments.push(...route.name.split('/'));
        key = route.key;
        s = route.state;
    }
    const path = segments.filter(
        (segment) =>
            segment !== '__root' &&
            segment !== 'index' &&
            !(segment.startsWith('(') && segment.endsWith(')'))
    );
    return { key, name: `/${path.join('/')}` };
}

/**
 * Starts a Sentry navigation transaction for every screen the user lands on, so the requests the
 * screen makes are traced under it, and into the API. Sentry's `expoRouterIntegration` (8.29)
 * reads Expo Router internals that SDK 58 removed (the router store, and the navigation
 * container's `__unsafe_action__` event), so it never starts one. Used once, in the root layout.
 * If a later Sentry SDK supports this Expo Router again, delete this for its integration.
 */
export function useSentryScreenTransactions() {
    const navigation = useNavigationContainerRef();

    useEffect(() => {
        let lastRouteKey: string | undefined;
        const onStateChange = () => {
            if (!navigation.isReady()) return;
            const { key, name } = focusedScreen(navigation.getRootState());
            // same screen: a drawer toggle or setParams, not a navigation
            if (!key || key === lastRouteKey) return;
            lastRouteKey = key;
            Sentry.startIdleNavigationSpan({
                name,
                op: 'navigation',
                attributes: { 'route.name': name, 'sentry.source': 'route' },
            });
        };
        onStateChange();
        // the container emits `state` before the new screen's effects start its queries, so
        // those requests land in this transaction
        return navigation.addListener('state', onStateChange);
    }, [navigation]);
}
