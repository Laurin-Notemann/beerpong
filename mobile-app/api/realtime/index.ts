import { BackOff, FIBONACCI_TIMEOUTS } from '@/api/utils/BackOff';
import { ScopedLogger } from '@/utils/logging';

export type RealtimeAffectedEntity =
    | 'GROUPS'
    | 'MATCHES'
    | 'SEASONS'
    | 'PLAYERS'
    | 'RULES'
    | 'RULE_MOVES'
    | 'PROFILES'
    | 'LIVE_MATCHES';

export interface RealtimeEvent<T = RealtimeAffectedEntity> {
    groupId: string;
    scope: string;
    eventType: T;
    body?: unknown;
}

export type RealtimeEventHandler = <T = RealtimeAffectedEntity>(
    event: RealtimeEvent<T>
) => void;

type Handlers = Record<RealtimeAffectedEntity | '*', RealtimeEventHandler[]>;

export class RealtimeClient {
    private ws!: WebSocket;

    public logger: ScopedLogger;

    private handlers: Handlers = {} as Handlers;

    private connectionBackoff = new BackOff([0, ...FIBONACCI_TIMEOUTS]);

    private hasOpened = false;

    private reconnectHandlers: (() => void)[] = [];

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
            this.connectionBackoff.reset();

            // events sent while the socket was down are lost; listeners catch up
            if (this.hasOpened) {
                for (const handler of this.reconnectHandlers) {
                    try {
                        handler();
                    } catch (err) {
                        this.logger.error('reconnect handler failed:', err);
                    }
                }
            }
            this.hasOpened = true;
        });

        this.ws.addEventListener('close', () => {
            const backoffMs = this.connectionBackoff.getAndIncrement();

            this.logger.info(`connection closed, retrying in ${backoffMs}ms`);

            setTimeout(() => this.connect(), backoffMs);
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

        this.logger = new ScopedLogger('realtime').disableConsole();
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
                } catch (err) {
                    // one broken handler mustn't stop the others, but it has to show up in Sentry
                    this.logger.error(
                        'handler failed:',
                        event.eventType,
                        event.scope,
                        err
                    );
                }
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
        /** every time the socket opens again after it was closed; returns the unsubscribe */
        reconnect: (handler: () => void) => {
            this.reconnectHandlers.push(handler);
            return () => {
                this.reconnectHandlers = this.reconnectHandlers.filter(
                    (i) => i !== handler
                );
            };
        },
    };
    public get isOpen(): boolean {
        return this.ws?.readyState === WebSocket.OPEN;
    }
}
