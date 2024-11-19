import { TextEncoder } from 'text-encoding';

import { Logger, ScopedLogger } from '@/utils/logging';

/**
 * stompjs is an abstraction layer on top of websocket that uses the global TextEncoder class.
 *
 * for react-native, it needs a polyfill: https://github.com/stomp-js/stompjs/issues/565#issuecomment-2197853028
 */
function mountPolyfillForStompJs() {
    global.TextEncoder = TextEncoder;
}
mountPolyfillForStompJs();

export type RealtimeAffectedEntity =
    | 'GROUPS'
    | 'MATCHES'
    | 'SEASONS'
    | 'PLAYERS'
    | 'RULES'
    | 'RULE_MOVES';

export interface RealtimeEvent<T = RealtimeAffectedEntity> {
    groupId: string;
    scope: string;
    eventType: T;
    body?: unknown;
}

export type RealtimeEventHandler = <T = RealtimeAffectedEntity>(
    event: RealtimeEvent<T>
) => void;

export class RealtimeClient {
    private ws!: WebSocket;

    public logger: Logger;

    // @ts-ignore
    private handlers: Record<
        RealtimeAffectedEntity | '*',
        RealtimeEventHandler[]
    > = {};

    private get url() {
        return this.host + '/update-socket';
    }

    private sendMessage(message: unknown) {
        if (this.ws && this.ws.readyState === WebSocket.OPEN) {
            this.ws.send(JSON.stringify(message));
        }
    }
    private _subscribeToGroups() {
        this.sendMessage({ groupIds: this.groupIds });
        this.logger.info('subscribed to groups:', this.groupIds);
    }

    private connect() {
        this.ws = new WebSocket(this.url);

        this.ws.addEventListener('open', () => {
            this.logger.info('connection opened');
            this._subscribeToGroups();
        });

        this.ws.addEventListener('close', () => {
            this.logger.info('connection closed');
        });

        this.ws.addEventListener('error', (e) => {
            this.logger.error('error:', e);
        });

        this.ws.addEventListener('message', (e) => this.onMessage(e));
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

        this.logger = new ScopedLogger('realtime');
    }

    /**
     * update the connection so we receive events for the new group ids
     */
    public subscribeToGroups(groupIds: string[]) {
        this.groupIds = groupIds;

        this._subscribeToGroups();
    }

    private fireHandlers(event: RealtimeEvent) {
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        for (const [_, handlers] of Object.entries(this.handlers).filter(
            ([handlerScope]) =>
                handlerScope === event.eventType || handlerScope === '*'
        )) {
            for (const handler of handlers) {
                try {
                    handler(event);
                    // eslint-disable-next-line @typescript-eslint/no-unused-vars
                } catch (_) {}
            }
        }
    }

    private onMessage(e: MessageEvent<any>) {
        try {
            const data: RealtimeEvent = JSON.parse(e.data);

            this.logger.info('message:', data);

            this.fireHandlers(data);
            // eslint-disable-next-line @typescript-eslint/no-unused-vars
        } catch (_) {
            this.logger.error('error json parsing message:', e.data);
        }
    }

    private registerHandler(
        scope: RealtimeAffectedEntity | '*',
        handler: RealtimeEventHandler
    ) {
        if (!this.handlers[scope]) this.handlers[scope] = [];
        this.handlers[scope].push(handler);
    }

    public on = {
        event: (handler: RealtimeEventHandler) => {
            this.registerHandler('*', handler);
        },
    };
}
