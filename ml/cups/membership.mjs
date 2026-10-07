// Offline evaluation loads the deployed membership and match reducer, rather than copying them.
import { createHash } from 'node:crypto';
import { readFile, writeFile } from 'node:fs/promises';
import { createRequire } from 'node:module';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const repo = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
const require = createRequire(resolve(repo, 'apps/web/package.json'));
const { createServer } = await import(require.resolve('vite'));
const [input, output] = process.argv.slice(2);
if (!input || !output)
    throw new Error(
        'Usage: node ml/cups/membership.mjs input.json output.json'
    );
const data = JSON.parse(await readFile(input, 'utf8'));
const server = await createServer({
    configFile: false,
    root: repo,
    appType: 'custom',
    server: { middlewareMode: true, hmr: false, watch: null },
    optimizeDeps: { noDiscovery: true },
    resolve: {
        alias: {
            '~': resolve(repo, 'apps/web/src'),
            '@': resolve(repo, 'apps/mobile'),
        },
    },
});
try {
    const { CupMembership } = await server.ssrLoadModule(
        '/apps/web/src/tv/lib/cupMembership.ts'
    );
    const { CupPersistence } = await server.ssrLoadModule(
        '/apps/web/src/tv/lib/cupPersistence.ts'
    );
    const { parseCupFrame } = await server.ssrLoadModule(
        '/apps/web/src/tv/lib/cupVision.ts'
    );
    const { reduceLiveMatch } = await server.ssrLoadModule(
        '/apps/mobile/lib/liveMatch/reducer.ts'
    );
    const { standingCups } = await server.ssrLoadModule(
        '/apps/mobile/lib/cupHits.ts'
    );
    const trackers = new Map();
    const results = [];
    for (const row of data.frames) {
        const frame = parseCupFrame(
            JSON.stringify({
                version: 1,
                model: data.model.id,
                sequence: 0,
                ageMs: 0,
                cups: row.cups,
            })
        );
        if (!frame || !Number.isFinite(row.atMs) || !(row.aspect > 0))
            throw new Error('Invalid source geometry or time: ' + row.id);
        const areas = row.coreAreas;
        if (
            !Array.isArray(areas) ||
            areas.length !== 2 ||
            areas.some(
                (a) =>
                    ![a.x, a.y, a.width, a.height].every(Number.isFinite) ||
                    Math.min(a.x, a.y) < 0 ||
                    Math.min(a.width, a.height) <= 0 ||
                    a.x + a.width > 1 ||
                    a.y + a.height > 1
            ) ||
            !(
                areas[0].x + areas[0].width <= areas[1].x ||
                areas[1].x + areas[1].width <= areas[0].x ||
                areas[0].y + areas[0].height <= areas[1].y ||
                areas[1].y + areas[1].height <= areas[0].y
            )
        )
            throw new Error('Invalid calibrated core areas: ' + row.id);
        // A source reviewer supplies match identity/orientation independently of cup GT.
        let expected = null;
        let ignoredOpIds = [];
        const context = row.matchContext;
        if (context) {
            if (
                !context.reviewed ||
                !context.reviewer ||
                !context.reviewedAt ||
                !context.liveMatchId ||
                !Array.isArray(context.teams) ||
                context.teams.length !== 2 ||
                [...context.teams]
                    .sort((a, b) => a.localeCompare(b))
                    .join(',') !== 'blue,red'
            )
                throw new Error(
                    'Unreviewed historical team mapping: ' + row.id
                );
            const ops = data.events
                .filter(
                    (e) =>
                        e.live_match_id === context.liveMatchId &&
                        Date.parse(e.created_at) <= row.atMs
                )
                .map((e) => ({
                    ...e.payload,
                    type: e.type,
                    id: e.id,
                    seq: e.seq,
                }));
            if (!ops.some((op) => op.type === 'SET_TEAMS'))
                throw new Error(
                    'Historical match log lacks SET_TEAMS: ' + row.id
                );
            const reduced = reduceLiveMatch(ops);
            ignoredOpIds = reduced.ignoredOpIds;
            expected = context.teams.map(
                (team) => standingCups(reduced.state.cupHits, team).length
            );
        }
        const key = JSON.stringify([
            row.session,
            areas,
            context?.liveMatchId ?? null,
            context?.teams ?? null,
        ]);
        let tracker = trackers.get(key);
        if (!tracker) {
            tracker = {
                membership: new CupMembership(),
                persistence: [new CupPersistence(), new CupPersistence()],
                last: -Infinity,
            };
            trackers.set(key, tracker);
        }
        if (row.atMs <= tracker.last)
            throw new Error(
                'Source observations must be chronological: ' + row.id
            );
        tracker.last = row.atMs;
        const selected = tracker.membership.observe(
            frame.cups,
            areas,
            row.aspect,
            row.atMs,
            expected,
            key
        );
        const displayed = selected.sides.flatMap((cups, side) => {
            const shown = tracker.persistence[side].observe(cups, row.atMs);
            return expected ? shown.cups.slice(0, expected[side]) : shown.cups;
        });
        results.push({
            id: row.id,
            expected,
            context: context ? 'reviewed-match' : 'unknown-match',
            ignoredOpIds,
            ...selected,
            displayed,
            held: Math.max(0, displayed.length - selected.cups.length),
        });
    }
    const source = await Promise.all(
        [
            'apps/web/src/tv/lib/cupMembership.ts',
            'apps/web/src/tv/lib/cupPersistence.ts',
            'apps/web/src/tv/lib/cupVision.ts',
            'apps/mobile/lib/liveMatch/reducer.ts',
            'apps/mobile/lib/cupHits.ts',
            'apps/mobile/components/CupGrid/Formation.ts',
        ].map((name) => readFile(resolve(repo, name)))
    );
    await writeFile(
        output,
        JSON.stringify({
            model: data.model,
            membershipSourceSha256: createHash('sha256')
                .update(Buffer.concat(source))
                .digest('hex'),
            results,
        }) + '\n'
    );
} finally {
    await server.close();
}
