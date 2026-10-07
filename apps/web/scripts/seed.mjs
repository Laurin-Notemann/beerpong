// Local test data for the TV, through the API like the app makes it: a group of made-up players,
// finished matches for the leaderboard and live matches in progress.
//
//   VERSUS_API_URL=http://localhost:8080 npm run seed          creates it, prints the group code
//   VERSUS_API_URL=http://localhost:8080 npm run seed -- play  keeps hitting cups in the live matches
//
// Never point this at a server with real users.
import { randomUUID } from 'node:crypto';
import { readFileSync, writeFileSync } from 'node:fs';

const API = (process.env.VERSUS_API_URL ?? 'http://localhost:8080').replace(/\/$/, '');
const STATE = new URL('./.seed.json', import.meta.url);
const NAMES = [
    'Anna',
    'Ben',
    'Cleo',
    'Dario',
    'Emil',
    'Fenja',
    'Greta',
    'Hannes',
    'Ida',
    'Jonas',
    'Kira',
    'Lio',
];
const PYRAMID = [
    [0, 0],
    [2, 0],
    [4, 0],
    [6, 0],
    [1, 2],
    [3, 2],
    [5, 2],
    [2, 4],
    [4, 4],
    [3, 6],
].map(([x, y]) => ({ x, y }));

async function call(path, { method = 'GET', token, body } = {}) {
    const res = await fetch(API + path, {
        method,
        headers: {
            'Content-Type': 'application/json',
            ...(token && { Authorization: `Bearer ${token}` }),
        },
        ...(body && { body: JSON.stringify(body) }),
    });
    const json = await res.json().catch(() => null);
    if (json?.status !== 'OK')
        throw new Error(`${method} ${path}: ${res.status} ${JSON.stringify(json)}`);
    return json.data;
}

async function login(refreshToken) {
    refreshToken ??= (
        await call('/auth/signup', {
            method: 'POST',
            body: { installationType: 'IOS', deviceId: randomUUID() },
        })
    ).token;
    const { token } = await call('/auth/refresh', { method: 'POST', body: { refreshToken } });
    return { refreshToken, token };
}

const pick = (list, n) => [...list].sort(() => Math.random() - 0.5).slice(0, n);
const rand = (min, max) => min + Math.floor(Math.random() * (max - min + 1));

async function seed() {
    const { refreshToken, token } = await login();
    const group = await call('/groups', {
        method: 'POST',
        token,
        body: { name: 'Thursday Cup Club', profileNames: NAMES, sportPreset: 'beerpong' },
    });
    const g = `/groups/${group.id}`;
    const s = `${g}/seasons/${group.activeSeasonId}`;
    const profiles = await call(`${g}/profiles`, { token });
    const players = await call(`${s}/players?showInactive=true`, { token });
    const moves = Object.fromEntries(
        (await call(`${s}/rule-moves`, { token })).map((m) => [m.name, m.id])
    );
    const playerOf = (name) =>
        players.find((p) => p.profileId === profiles.find((i) => i.name === name).id).id;

    // a few dozen matches, so the leaderboard has an order (some players are better than others)
    const skill = Object.fromEntries(NAMES.map((n, i) => [n, 1 - i / NAMES.length / 1.4]));
    for (let i = 0; i < 40; i++) {
        const [a, b, c, d] = pick(NAMES.slice(0, 10), 4);
        const blueWins =
            Math.random() < (skill[a] + skill[b]) / (skill[a] + skill[b] + skill[c] + skill[d]);
        const [win, lose] = blueWins
            ? [
                  [a, b],
                  [c, d],
              ]
            : [
                  [c, d],
                  [a, b],
              ];
        const team = (names, won) => ({
            teamMembers: names.map((n, idx) => ({
                playerId: playerOf(n),
                moves: [
                    { moveId: moves.Normal, count: won ? (idx ? 4 : 3) : rand(1, 4) },
                    ...(won && idx === 0 ? [{ moveId: moves['Finish - Normal'], count: 1 }] : []),
                    ...(Math.random() < 0.3 ? [{ moveId: moves.Bomb, count: 1 }] : []),
                ],
            })),
        });
        const [blue, red] = blueWins
            ? [team(win, true), team(lose, false)]
            : [team(lose, false), team(win, true)];
        await call(`${s}/matches`, { method: 'POST', token, body: { teams: [blue, red] } });
    }

    // live matches with different players (LIVE, default 2, at most 3), a few cups in
    const liveCount = Math.min(3, Number(process.env.LIVE ?? 2));
    const free = pick(NAMES, 12);
    const live = [];
    for (let i = 0; i < liveCount; i++) {
        const [b1, b2, r1, r2] = free.slice(i * 4, i * 4 + 4).map(playerOf);
        const id = randomUUID();
        const ops = [
            {
                id: randomUUID(),
                type: 'SET_TEAMS',
                bluePlayerIds: [b1, b2],
                redPlayerIds: [r1, r2],
            },
        ];
        await call(`${g}/live-matches/${id}`, {
            method: 'PUT',
            token,
            body: { seasonId: group.activeSeasonId, ops },
        });
        live.push({ id, blue: [b1, b2], red: [r1, r2], hits: { blue: [], red: [] } });
    }
    const state = {
        refreshToken,
        groupId: group.id,
        seasonId: group.activeSeasonId,
        inviteCode: group.inviteCode,
        moves,
        live,
    };
    for (let i = 0; i < 3 * liveCount; i++) await hit(state, token, state.live[i % liveCount]);

    writeFileSync(STATE, JSON.stringify(state, null, 2));
    console.log(`Group "${group.name}" created. Group code: ${group.inviteCode}`);
}

/** one cup hit in a live match, by a random player on a random side; false when it's over */
async function hit(state, token, match) {
    const side = Math.random() < 0.5 ? 'blue' : 'red';
    const target = side === 'blue' ? 'red' : 'blue';
    const left = PYRAMID.filter((c) => !match.hits[target].some((h) => h.x === c.x && h.y === c.y));
    if (left.length <= 1) return false; // the last cup is the finish, which the app enters
    const cup = left[rand(0, left.length - 1)];
    match.hits[target].push(cup);
    const op = {
        id: randomUUID(),
        type: 'RECORD_CUP_HIT',
        team: target,
        playerId: match[side][rand(0, 1)],
        moveId: state.moves.Normal,
        cups: [cup],
    };
    await call(`/groups/${state.groupId}/live-matches/${match.id}/ops`, {
        method: 'POST',
        token,
        body: { ops: [op] },
    });
    return true;
}

async function play() {
    const state = JSON.parse(readFileSync(STATE, 'utf8'));
    const { token } = await login(state.refreshToken);
    const every = Number(process.argv[3] ?? 2500);
    console.log(`Hitting a cup every ${every} ms. Ctrl-C to stop.`);
    for (;;) {
        await new Promise((r) => setTimeout(r, every));
        const open = state.live.filter((m) => m.hits.blue.length < 9 || m.hits.red.length < 9);
        if (!open.length) break;
        await hit(state, token, open[rand(0, open.length - 1)]);
        writeFileSync(STATE, JSON.stringify(state, null, 2));
    }
}

await (process.argv[2] === 'play' ? play() : seed());
