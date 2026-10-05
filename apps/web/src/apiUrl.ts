// Where the Go API is, for the TV and the simulator alike. VERSUS_API_URL is how this server
// reaches it; VERSUS_API_PUBLIC_URL is how browsers reach its websocket, when that differs (on
// staging the server uses the Docker network, browsers the public HTTPS URL).

/** the Go API, as this server reaches it */
export const apiUrl = () =>
    (process.env.VERSUS_API_URL ?? 'http://localhost:8080').replace(/\/$/, '');

/** the API's websocket, as browsers reach it */
export const socketUrl = () =>
    (process.env.VERSUS_API_PUBLIC_URL ?? apiUrl()).replace(/\/$/, '').replace(/^http/, 'ws') +
    '/update-socket';
