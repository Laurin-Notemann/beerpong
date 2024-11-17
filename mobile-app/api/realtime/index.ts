export type RealtimeEventScope =
    | 'seasons'
    | 'matches'
    | 'players'
    | 'groups'
    | 'rules'
    | 'ruleMoves';

export interface RealtimeEvent<T = RealtimeEventScope> {
    groupId: string;
    scope: T;
}

export type RealtimeEventHandler = <T = RealtimeEventScope>(
    event: RealtimeEvent<T>
) => void;

export class RealtimeClient {
    private ws!: WebSocket;

    // @ts-ignore
    private handlers: Record<RealtimeEventScope | '*', RealtimeEventHandler[]> =
        {};

    private get url() {
        return this.host + '/update-socket?groups=' + this.groupIds.join(',');
    }

    private connect() {
        this.ws = new WebSocket(this.url);

        this.ws.onopen = this.onOpen;
        this.ws.onmessage = this.onEvent;
        this.ws.onerror = this.onError;
        this.ws.onclose = this.onClose;
    }
    private disconnect() {
        this.ws.close();
    }
    private reconnect() {
        this.disconnect();
        this.reconnect();
    }

    /**
     * @param host looks like `ws://localhost:8080`
     * @param groupId the groups to receive events for
     */
    constructor(
        private host: string,
        private groupIds: string[]
    ) {
        this.connect();
    }

    public setGroupIds(groupIds: string[]) {
        this.groupIds = groupIds;

        this.reconnect();
    }

    private fireHandlers(event: RealtimeEvent) {
        for (const [_, handlers] of Object.entries(this.handlers).filter(
            ([handlerScope]) =>
                handlerScope === event.scope || handlerScope === '*'
        )) {
            for (const handler of handlers) {
                try {
                    handler(event);
                } catch (err) {}
            }
        }
    }

    private onEvent(e: MessageEvent<any>) {
        try {
            const data: RealtimeEvent = JSON.parse(e.data);

            this.fireHandlers(data);
        } catch (err) {
            // eslint-disable-next-line
            console.error('[realtime] error json parsing message:', err);
        }
    }
    private onOpen(e: Event) {}
    private onError(e: Event) {
        // eslint-disable-next-line
        console.error('[realtime] socket error:', e);
    }
    private onClose(e: Event) {}

    private registerHandler(
        scope: RealtimeEventScope | '*',
        handler: RealtimeEventHandler
    ) {
        if (!this.handlers[scope]) this.handlers[scope] = [];
        this.handlers[scope].push(handler);
    }

    public on = {
        event: (handler: RealtimeEventHandler) => {
            this.registerHandler('*', handler);
        },
        matches: {
            event: (handler: RealtimeEventHandler) => {
                this.registerHandler('matches', handler);
            },
        },
        players: {
            event: (handler: RealtimeEventHandler) => {
                this.registerHandler('players', handler);
            },
        },
    };
}
