import { createFileRoute, Link, useRouter } from '@tanstack/react-router';

import { getSimulation, type Params, type Simulation, type TestGame } from '~/simulator/api';
import { Simulator } from '~/simulator/components/Simulator';
import { useLive } from '~/simulator/live';

// The season, the weights and the test games live in the URL, so a link
// shows the same thing.
type Search = { season?: string; tests?: TestGame[] } & Partial<Params>;

const number = (v: unknown) => {
    const n = typeof v === 'number' ? v : typeof v === 'string' ? Number(v) : NaN;
    return Number.isFinite(n) ? n : undefined;
};

export const Route = createFileRoute('/_simulator/$code')({
    validateSearch: (search: Record<string, unknown>): Search => ({
        season: typeof search.season === 'string' ? search.season : undefined,
        k: number(search.k),
        kr: number(search.kr),
        ringWeight: number(search.ringWeight),
        swing: number(search.swing),
        // the API checks them; a broken one shows as an error, not a crash
        tests:
            Array.isArray(search.tests) && search.tests.length
                ? (search.tests as TestGame[])
                : undefined,
    }),
    loaderDeps: ({ search }) => search,
    loader: ({ params, deps }) => getSimulation({ data: { code: params.code, ...deps } }),
    head: ({ loaderData }) => ({
        meta: [
            {
                title: loaderData?.groupName
                    ? `${loaderData.groupName} · beerpong-var`
                    : 'beerpong-var',
            },
        ],
    }),
    component: GroupPage,
    errorComponent: PageError,
});

// An error doesn't take the page down for good: retrying loads everything again.
function PageError({ error, reset }: { error: unknown; reset: () => void }) {
    const router = useRouter();
    return (
        <main className="wrap gate">
            <div className="eyebrow">beerpong-var</div>
            <h1>Something went wrong</h1>
            <p className="lead">{error instanceof Error ? error.message : String(error)}</p>
            <div className="codeform">
                <button
                    className="btn"
                    type="button"
                    onClick={() => {
                        reset();
                        void router.invalidate();
                    }}
                >
                    Try again
                </button>
            </div>
        </main>
    );
}

function GroupPage() {
    const sim = Route.useLoaderData();
    if (!sim) {
        return (
            <main className="wrap gate">
                <div className="eyebrow">beerpong-var</div>
                <h1>No group with that code</h1>
                <p className="lead">
                    Check the invite code in the app's group settings.{' '}
                    <Link to="/">Try another code</Link>
                </p>
            </main>
        );
    }
    return <LiveGroup sim={sim} />;
}

function LiveGroup({ sim }: { sim: Simulation }) {
    const router = useRouter();
    const { code } = Route.useParams();
    const search = Route.useSearch();
    const navigate = Route.useNavigate();
    const live = useLive(sim.socketUrl, sim.groupId, () => void router.invalidate());
    return (
        <Simulator
            sim={sim}
            code={code}
            tests={search.tests ?? []}
            live={live}
            onChange={(next) =>
                void navigate({ search: { ...search, ...next }, replace: true, resetScroll: false })
            }
        />
    );
}
