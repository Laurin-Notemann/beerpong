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

/**
 * Puts script errors on the screen, with the browser's user agent: a TV has no dev tools, so
 * a photo of the screen is how we learn why a TV's browser can't run the page.
 */
const showErrors = `(function () {
    function show(message) {
        var box = document.getElementById('tv-errors');
        if (!box) {
            box = document.createElement('pre');
            box.id = 'tv-errors';
            box.style.cssText = 'position:fixed;left:0;right:0;bottom:0;z-index:99999;margin:0;padding:12px 16px;max-height:40vh;overflow:auto;white-space:pre-wrap;font:14px/1.4 monospace;background:#300;color:#fdd';
            box.textContent = 'Versus TV could not start in this browser.\\n' + navigator.userAgent + '\\n';
            (document.body || document.documentElement).appendChild(box);
        }
        box.textContent += '\\n' + message;
    }
    window.addEventListener('error', function (e) {
        show((e.message || 'error') + (e.filename ? ' (' + e.filename + ':' + e.lineno + ')' : ''));
    });
    window.addEventListener('unhandledrejection', function (e) {
        show('unhandled: ' + (e.reason && (e.reason.stack || e.reason.message) || e.reason));
    });
})();`;

/**
 * Old browsers (TVs) get core-js before the app's modules run (scripts/polyfills.mjs);
 * modern ones skip the download. `Array.prototype.at` (Chrome 92) is the newest built-in the
 * app and its libraries are known to need, so a browser with it needs nothing.
 */
const loadPolyfills = `if (!Array.prototype.at || typeof globalThis === 'undefined') {
    document.write('<script src="${import.meta.env.BASE_URL}polyfills.js"><\\/script>');
}`;

/** marks browsers without flexbox gap (Chromium before 84), see flexGapFallback.ts */
const detectFlexGap = `(function () {
    var d = document.createElement('div');
    d.style.cssText = 'display:flex;flex-direction:column;row-gap:1px;position:absolute';
    d.appendChild(document.createElement('div'));
    d.appendChild(document.createElement('div'));
    document.documentElement.appendChild(d);
    if (d.scrollHeight !== 1) document.documentElement.className += ' no-flex-gap';
    d.parentNode.removeChild(d);
})();`;

function Shell({ children }: { children: React.ReactNode }) {
    return (
        <html lang="en">
            <head>
                {/* runs before the app (plain ES5, so even browsers the app can't run run it) */}
                <script dangerouslySetInnerHTML={{ __html: showErrors }} />
                <script dangerouslySetInnerHTML={{ __html: loadPolyfills }} />
                <script dangerouslySetInnerHTML={{ __html: detectFlexGap }} />
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
