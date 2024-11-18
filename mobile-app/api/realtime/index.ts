import { IMessage } from '@stomp/stompjs';
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
    private ws!: WebSocket;

    private logger: Logger;

    // @ts-ignore
    private handlers: Record<RealtimeEventScope | '*', RealtimeEventHandler[]> =
        {};

    private get url() {
        return this.host + '/update-socket';
    }

    private sendMessage(message: unknown) {
        if (this.ws && this.ws.readyState === WebSocket.OPEN) {
            this.ws.send(JSON.stringify(message));
        }
    }
    private subscribeToGroups() {
        this.sendMessage({ groupIds: this.groupIds });
        this.logger.info('subscribed to groups:', this.groupIds);
    }

    private connect() {
        this.ws = new WebSocket(this.url);

        this.ws.addEventListener('open', () => {
            this.logger.info('connection opened');
            this.subscribeToGroups();
        });

        this.ws.addEventListener('close', () => {
            this.logger.info('connection closed');
        });

        this.ws.addEventListener('error', (e) => {
            this.logger.error('error:', e);
        });

        this.ws.addEventListener('message', (e) => {
            const data = JSON.parse(e.data);
            this.logger.info('message:', data);
        });
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

    public setGroupIds(groupIds: string[]) {
        this.groupIds = groupIds;

        this.subscribeToGroups();
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

    private onMessage(message: IMessage) {
        try {
            const data: RealtimeEvent = JSON.parse(message.body);

            this.fireHandlers(data);
            // eslint-disable-next-line @typescript-eslint/no-unused-vars
        } catch (_) {
            this.logger.error('error json parsing message:', message);
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
