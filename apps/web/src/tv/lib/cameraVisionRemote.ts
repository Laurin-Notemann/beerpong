import { validAreas, type PlayingArea } from '~/tv/lib/cupVision';

export interface VisionSettings {
    enabled: boolean;
    areas: PlayingArea[] | null;
    syncMatchId: string;
    firstTeam: 'blue' | 'red';
    syncTvId?: string;
}
export interface VisionState extends VisionSettings {
    session: string;
    revision: number;
    device: string;
    width: number;
    height: number;
    status: string;
    syncStatus: string;
    watching: number;
    recording: boolean;
    pendingUploads: number;
    selectingAreas: boolean;
    matches: { id: string; seq: number; blue: number; red: number }[];
    lastCommand: 'applied' | 'rejected' | null;
}
export interface VisionCommand {
    session: string;
    revision: number;
    device: string;
    settings: VisionSettings;
    expiresAt: number;
}
const object = (v: unknown): v is Record<string, unknown> => !!v && typeof v === 'object';
const text = (v: unknown, max = 200): v is string => typeof v === 'string' && v.length <= max;
const integer = (v: unknown, max: number): v is number =>
    typeof v === 'number' && Number.isSafeInteger(v) && v >= 0 && v <= max;
export function validVisionSettings(v: unknown): v is VisionSettings {
    return (
        object(v) &&
        typeof v.enabled === 'boolean' &&
        (v.areas === null || validAreas(v.areas)) &&
        text(v.syncMatchId, 36) &&
        (v.syncMatchId === '' || /^[0-9a-f-]{36}$/.test(v.syncMatchId)) &&
        (v.firstTeam === 'blue' || v.firstTeam === 'red') &&
        (v.syncTvId === undefined ||
            (text(v.syncTvId, 64) &&
                (v.syncTvId === '' || /^[A-Za-z0-9_-]{16,64}$/.test(v.syncTvId))))
    );
}
export function validVisionState(v: unknown): v is VisionState {
    return (
        validVisionSettings(v) &&
        object(v) &&
        text(v.session, 64) &&
        v.session.length >= 16 &&
        integer(v.revision, 1e9) &&
        text(v.device, 256) &&
        integer(v.width, 16384) &&
        integer(v.height, 16384) &&
        text(v.status) &&
        text(v.syncStatus) &&
        integer(v.watching, 100) &&
        typeof v.recording === 'boolean' &&
        integer(v.pendingUploads, 100) &&
        typeof v.selectingAreas === 'boolean' &&
        (v.lastCommand === null || v.lastCommand === 'applied' || v.lastCommand === 'rejected') &&
        Array.isArray(v.matches) &&
        v.matches.length <= 100 &&
        v.matches.every(
            (m: unknown) =>
                object(m) &&
                text(m.id, 36) &&
                integer(m.seq, 1e9) &&
                integer(m.blue, 10) &&
                integer(m.red, 10)
        )
    );
}
