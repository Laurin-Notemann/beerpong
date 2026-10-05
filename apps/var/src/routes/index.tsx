import { createFileRoute, useNavigate } from '@tanstack/react-router';
import { useState } from 'react';

export const Route = createFileRoute('/')({ component: Home });

function Home() {
    const navigate = useNavigate();
    const [code, setCode] = useState('');
    return (
        <main className="wrap gate">
            <div className="eyebrow">beerpong-var</div>
            <h1>
                Versus Elo <span className="cup">simulator</span>
            </h1>
            <p className="lead">
                Every season of a group, replayed through the API's own Elo code and updated live.
                Open a group with its invite code, the one you join it with in the app.
            </p>
            <form
                className="codeform"
                onSubmit={(e) => {
                    e.preventDefault();
                    const c = code.trim().toUpperCase();
                    if (c) void navigate({ to: '/$code', params: { code: c } });
                }}
            >
                <label htmlFor="code">Invite code</label>
                <input
                    id="code"
                    value={code}
                    onChange={(e) => setCode(e.target.value)}
                    autoComplete="off"
                    autoCapitalize="characters"
                    spellCheck={false}
                    placeholder="ABC123XYZ"
                />
                <button className="btn" type="submit">
                    Open
                </button>
            </form>
        </main>
    );
}
