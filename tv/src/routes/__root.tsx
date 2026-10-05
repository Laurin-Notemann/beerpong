import { type QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { createRootRouteWithContext, HeadContent, Outlet, Scripts } from '@tanstack/react-router';

import appCss from '~/styles.css?url';

export const Route = createRootRouteWithContext<{ queryClient: QueryClient }>()({
    head: () => ({
        meta: [
            { charSet: 'utf-8' },
            {
                name: 'viewport',
                content: 'width=device-width, initial-scale=1, viewport-fit=cover',
            },
            { name: 'theme-color', content: '#000000' },
            { title: 'Versus TV' },
        ],
        links: [{ rel: 'stylesheet', href: appCss }],
    }),
    shellComponent: Shell,
    component: Root,
});

function Shell({ children }: { children: React.ReactNode }) {
    return (
        <html lang="en">
            <head>
                <HeadContent />
            </head>
            <body>
                {children}
                <Scripts />
            </body>
        </html>
    );
}

function Root() {
    const { queryClient } = Route.useRouteContext();
    return (
        <QueryClientProvider client={queryClient}>
            <Outlet />
        </QueryClientProvider>
    );
}
