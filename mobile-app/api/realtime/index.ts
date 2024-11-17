import { Client, IMessage } from '@stomp/stompjs';
import { TextEncoder } from 'text-encoding';

/**
 * stompjs is an abstraction layer on top of websocket that uses the global TextEncoder class.
 *
 * for react-native, it needs a polyfill: https://github.com/stomp-js/stompjs/issues/565#issuecomment-2197853028
 */
function mountPolyfillForStompJs() {
    global.TextEncoder = TextEncoder;
}
mountPolyfillForStompJs();

export type RealtimeEventScope =
    | 'GROUPS'
    | 'MATCHES'
    | 'SEASONS'
    | 'PLAYERS'
    | 'RULES';

export interface RealtimeEvent<T = RealtimeEventScope> {
    groupId: string;
    scope: string;
    eventType: T;
    body?: unknown;
}

export type RealtimeEventHandler = <T = RealtimeEventScope>(
    event: RealtimeEvent<T>
) => void;

export class RealtimeClient {
    // private ws!: WebSocket;

    private client!: Client;

    // @ts-ignore
    private handlers: Record<RealtimeEventScope | '*', RealtimeEventHandler[]> =
        {};

    private get url() {
        const fragment =
            this.groupIds.length > 0
                ? '?groups=' + this.groupIds.join(',')
                : '';

        return this.host + '/update-socket' + fragment;
    }

    private connect() {
        const stompClient = new Client({
            webSocketFactory: () => new WebSocket(this.url),
            onConnect: () => {
                stompClient.subscribe('/events', (message) => {
                    this.onMessage(message);
                });
            },
            onStompError: (err) => {
                // eslint-disable-next-line
                console.error('[realtime] stomp error:', err);
            },
            onWebSocketError: (err) => {
                // eslint-disable-next-line
                console.error('[realtime] websocket error:', err);
            },
            onDisconnect: () => {},
            onWebSocketClose: () => {},
        });
        stompClient.activate();
    }
    private disconnect() {
        this.client?.deactivate();
    }

    private reconnect() {
        this.disconnect();
        this.connect();
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
                handlerScope === event.eventType || handlerScope === '*'
        )) {
            for (const handler of handlers) {
                try {
                    handler(event);
                } catch (err) {}
            }
        }
    }

    private onMessage(message: IMessage) {
        try {
            const data: RealtimeEvent = JSON.parse(message.body);

            this.fireHandlers(data);
        } catch (err) {
            // eslint-disable-next-line
            console.error('[realtime] error json parsing message:', err);
        }
    }

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
    };
}
