import { QueryClient } from '@tanstack/react-query';
import { createRouter } from '@tanstack/react-router';

import { routeTree } from './routeTree.gen';

const isTv = (pathname: string) => pathname === '/tv' || pathname.startsWith('/tv/');

export function getRouter() {
    // for the TV's pages (routes/tv.tsx)
    const queryClient = new QueryClient({
        defaultOptions: { queries: { staleTime: 5_000, retry: 2 } },
    });
    return createRouter({
        routeTree,
        context: { queryClient },
        // the TV has always been at /tv/ (the default, 'never', would redirect that to /tv)
        trailingSlash: 'preserve',
        // The simulator's pages are long. The TV's don't scroll, and the inline script this
        // writes into the page is too new for TV browsers.
        scrollRestoration: ({ location }) => !isTv(location.pathname),
    });
}

declare module '@tanstack/react-router' {
    interface Register {
        router: ReturnType<typeof getRouter>;
    }
}
