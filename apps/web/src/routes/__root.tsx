import type { QueryClient } from '@tanstack/react-query';
import { createRootRouteWithContext, HeadContent, Scripts } from '@tanstack/react-router';

/**
 * Only the document. The Elo simulator (`_simulator.tsx`) and Versus TV (`tv.tsx`) each add
 * their own head, stylesheet and scripts, so neither page gets the other's styles.
 */
export const Route = createRootRouteWithContext<{ queryClient: QueryClient }>()({
    head: () => ({ meta: [{ charSet: 'utf-8' }] }),
    shellComponent: Shell,
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
