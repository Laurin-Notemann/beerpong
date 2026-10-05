import { createFileRoute } from '@tanstack/react-router';

import styles from '~/simulator/styles.css?url';

const icon =
    "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 32 32'%3E%3Cpath d='M8 6h16l-3 22H11z' fill='%23d2412f'/%3E%3Crect x='7' y='5' width='18' height='3' rx='1' fill='%23f3efe6'/%3E%3C/svg%3E";

/** The Elo simulator's pages (`/` and `/$code`): its head and its own stylesheet, not the TV's. */
export const Route = createFileRoute('/_simulator')({
    head: () => ({
        meta: [
            { name: 'viewport', content: 'width=device-width, initial-scale=1' },
            { name: 'robots', content: 'noindex' },
            { title: 'beerpong-var' },
        ],
        links: [
            { rel: 'icon', href: icon },
            { rel: 'preconnect', href: 'https://fonts.googleapis.com' },
            { rel: 'preconnect', href: 'https://fonts.gstatic.com', crossOrigin: 'anonymous' },
            {
                rel: 'stylesheet',
                href: 'https://fonts.googleapis.com/css2?family=IBM+Plex+Mono:wght@400;500;600&family=IBM+Plex+Sans:wght@400;500;600;700&display=swap',
            },
            { rel: 'stylesheet', href: styles },
        ],
    }),
});
