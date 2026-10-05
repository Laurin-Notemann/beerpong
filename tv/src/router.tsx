import { QueryClient } from '@tanstack/react-query';
import { createRouter } from '@tanstack/react-router';

import { routeTree } from './routeTree.gen';

export function getRouter() {
    const queryClient = new QueryClient({
        defaultOptions: { queries: { staleTime: 5_000, retry: 2 } },
    });
    return createRouter({
        routeTree,
        basepath: import.meta.env.BASE_URL,
        context: { queryClient },
        defaultPreload: 'intent',
        scrollRestoration: true,
    });
}

declare module '@tanstack/react-router' {
    interface Register {
        router: ReturnType<typeof getRouter>;
    }
}
