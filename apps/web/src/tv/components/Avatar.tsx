/** a player's picture, or their initials on a tinted circle */
export function Avatar({
    name,
    url,
    className = 'size-10 text-base',
    ring,
}: {
    name: string;
    url: string | null;
    className?: string;
    ring?: string;
}) {
    const initials = name
        .split(/\s+/)
        .filter(Boolean)
        .slice(0, 2)
        .map((i) => i[0].toUpperCase())
        .join('');

    return (
        <div
            className={`${className} shrink-0 overflow-hidden rounded-full bg-panel-2 grid place-items-center font-semibold text-text-2 ${ring ?? ''}`}
        >
            {url ? <img src={url} alt="" className="size-full object-cover" /> : initials || '?'}
        </div>
    );
}
