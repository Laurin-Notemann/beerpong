export const sgn = (v: number, d = 1) => (v >= 0 ? '+' : '−') + Math.abs(v).toFixed(d);
export const pct = (v: number) => Math.round(v * 100) + '%';
export const isRing = (move: string | undefined) => /Ring/.test(move ?? '');
export const shortMove = (move: string | undefined) => (move ?? '').replace(/^Finish - /, '');
export const when = (iso: string) =>
    new Date(iso).toLocaleString(undefined, {
        day: 'numeric',
        month: 'short',
        hour: '2-digit',
        minute: '2-digit',
    });
