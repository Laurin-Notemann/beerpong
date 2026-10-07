import { useCallback, useEffect, useRef, useState } from 'react';

import {
    cupPoints,
    FormationFitter,
    StableFormation,
    type FormationMatch,
} from '~/tv/lib/cupFormation';
import type { CupFrame, PlayingArea } from '~/tv/lib/cupVision';
import { syncCameraFormation } from '~/tv/server/cupFormation';

/** Opt in for one match. Recognition may move cups; only recorded hits may remove them. */
export function useCupFormationSync(
    id: string,
    key: string,
    match: FormationMatch | undefined,
    areas: PlayingArea[] | null,
    firstTeam: 'blue' | 'red',
    syncTvId = ''
) {
    const source = `${match?.id ?? ''}:${match?.seq ?? 0}:${firstTeam}:${syncTvId}`;
    const [message, setMessage] = useState<{
        source: string;
        areas: PlayingArea[];
        text: string;
    } | null>(null);
    const state = useRef({ match, areas, firstTeam, syncTvId });
    useEffect(() => {
        state.current = { match, areas, firstTeam, syncTvId };
    }, [match, areas, firstTeam, syncTvId]);
    const trackers = useRef({ blue: new StableFormation(), red: new StableFormation() });
    const fitters = useRef({ blue: new FormationFitter(), red: new FormationFitter() });
    const busy = useRef(false);
    const resetAt = useRef(0);
    const generation = useRef(0);
    useEffect(() => {
        trackers.current = { blue: new StableFormation(), red: new StableFormation() };
        resetAt.current = performance.now();
        generation.current++;
    }, [match?.id, match?.seq, areas, firstTeam, syncTvId]);
    useEffect(() => {
        fitters.current = { blue: new FormationFitter(), red: new FormationFitter() };
    }, [match?.id, areas, firstTeam]);
    const observe = useCallback(
        (frame: CupFrame, aspect: number) => {
            const { match, areas, firstTeam, syncTvId } = state.current;
            if (!match || !areas || busy.current || performance.now() - resetAt.current < 5000)
                return;
            const token = generation.current;
            const setStatus = (text: string) =>
                setMessage({
                    source: `${match.id}:${match.seq}:${firstTeam}:${syncTvId}`,
                    areas,
                    text,
                });
            for (const [i, team] of [firstTeam, firstTeam === 'blue' ? 'red' : 'blue'].entries()) {
                const side = team as 'blue' | 'red';
                const seen = cupPoints(frame.cups, areas[i], aspect).length;
                const other = areas[1 - i];
                const towards = {
                    x: (other.x + other.width / 2 - areas[i].x - areas[i].width / 2) * aspect,
                    y: other.y + other.height / 2 - areas[i].y - areas[i].height / 2,
                };
                const drawn = fitters.current[side].observe(
                    frame.cups,
                    areas[i],
                    aspect,
                    match[side].map((slot) => slot.drawn),
                    match.templates,
                    towards
                );
                if (!drawn || drawn.length !== match[side].length) {
                    trackers.current[side].observe(null, performance.now());
                    setStatus(
                        `${side === 'blue' ? 'Blue' : 'Red'}: ${seen !== match[side].length ? `${seen} seen, ${match[side].length} in match; check playing area includes every cup` : 'grid fit ambiguous'}; sync paused`
                    );
                    continue;
                }
                const stable = trackers.current[side].observe(drawn, performance.now());
                if (!stable) continue;
                busy.current = true;
                void syncCameraFormation({
                    data: {
                        id,
                        key,
                        matchId: match.id,
                        seq: match.seq,
                        team: side,
                        drawn: stable,
                        firstTeam,
                        syncTvId,
                    },
                })
                    .then((result) => {
                        if (token !== generation.current) return;
                        setStatus(
                            result === 'updated' || result === 'unchanged'
                                ? 'Formation synced with match'
                                : 'Match changed; waiting for a fresh formation…'
                        );
                        void import('@sentry/browser').then((Sentry) =>
                            Sentry.logger.info('cup formation sync', {
                                cameraId: id,
                                matchId: match.id,
                                team: side,
                                model: frame.model,
                                result,
                                cupCount: stable.length,
                            })
                        );
                    })
                    .catch((error) => {
                        if (token === generation.current)
                            setStatus('Formation sync failed; retrying when stable');
                        void import('@sentry/browser').then((Sentry) =>
                            Sentry.captureException(error, {
                                tags: { operation: 'cup-formation-sync' },
                                extra: { cameraId: id, matchId: match.id },
                            })
                        );
                    })
                    .finally(() => {
                        busy.current = false;
                    });
                break;
            }
        },
        [id, key]
    );
    return {
        observe,
        status:
            !match || !areas
                ? 'Formation sync off'
                : message?.source === source && message.areas === areas
                  ? message.text
                  : 'Waiting for a stable formation…',
    };
}
