import { useEffect, useState } from 'react';

// TV browsers (Chromium before 71) only have the webkit-prefixed fullscreen API
type FullscreenDocument = Document & { webkitFullscreenElement?: Element | null };
type FullscreenElement = HTMLElement & { webkitRequestFullscreen?: () => void };

const isFullscreen = () =>
    !!(document.fullscreenElement || (document as FullscreenDocument).webkitFullscreenElement);

/**
 * Puts the TV page on the whole screen, without the browser's bars. Browsers only allow that
 * after a click on the page itself, so it's a button for the TV remote's pointer, not something
 * a phone can do. Hidden while fullscreen and where the browser can't do it.
 */
export function FullscreenButton() {
    const [fullscreen, setFullscreen] = useState(isFullscreen);
    const root = document.documentElement as FullscreenElement;
    const canRequest = !!(root.requestFullscreen || root.webkitRequestFullscreen);
    const request = () => {
        if (root.requestFullscreen) root.requestFullscreen().catch(() => {});
        else root.webkitRequestFullscreen?.();
    };

    useEffect(() => {
        const update = () => {
            setFullscreen(isFullscreen());
            document.documentElement.classList.toggle('fullscreen', isFullscreen());
        };
        update();
        document.addEventListener('fullscreenchange', update);
        document.addEventListener('webkitfullscreenchange', update);
        return () => {
            document.removeEventListener('fullscreenchange', update);
            document.removeEventListener('webkitfullscreenchange', update);
        };
    }, []);

    if (fullscreen || !canRequest) return null;
    return (
        <button
            onClick={request}
            className="fixed right-[2rem] bottom-[2rem] z-50 flex items-center gap-[0.8rem] rounded-full border border-line bg-panel-2 px-[2rem] py-[1rem] text-[1.6rem] font-semibold text-text shadow-lg focus:outline-none focus:ring-[0.3rem] focus:ring-live"
        >
            <span aria-hidden>⛶</span> Full screen
        </button>
    );
}
