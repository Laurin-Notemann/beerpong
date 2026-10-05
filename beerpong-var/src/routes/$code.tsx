import { createFileRoute, Link, useRouter } from '@tanstack/react-router';

import { getSimulation, type Params, type Simulation, type TestGame } from '~/api';
import { Simulator } from '~/components/Simulator';
import { useLive } from '~/live';

// The season, the weights and the test games live in the URL, so a link
// shows the same thing.
type Search = { season?: string; tests?: TestGame[] } & Partial<Params>;

const number = (v: unknown) => {
    const n = typeof v === 'number' ? v : typeof v === 'string' ? Number(v) : NaN;
    return Number.isFinite(n) ? n : undefined;
};

export const Route = createFileRoute('/$code')({
    validateSearch: (search: Record<string, unknown>): Search => ({
        season: typeof search.season === 'string' ? search.season : undefined,
        k: number(search.k),
        marginWeight: number(search.marginWeight),
        perPoint: number(search.perPoint),
        topWeight: number(search.topWeight),
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
});

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
