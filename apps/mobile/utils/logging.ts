/* eslint-disable no-console */

export type LogFunction = (...args: unknown[]) => void;

export interface Logger {
    fatal: LogFunction;
    error: LogFunction;
    warn: LogFunction;
    info: LogFunction;
    debug: LogFunction;
    trace: LogFunction;
}

/**
 * Makes `cause` enumerable on the logged errors and their causes. Set through
 * `new Error(message, { cause })` it isn't, and Sentry Logs only keep an error's message, stack
 * and enumerable properties: React logs a render error it recovered from as "There was an error
 * during concurrent rendering…" with the actual error only in `cause`.
 */
function exposeErrorCauses(args: unknown[]) {
    for (const arg of args) {
        let error = arg;
        for (let depth = 0; error instanceof Error && depth < 5; depth++) {
            const descriptor = Object.getOwnPropertyDescriptor(error, 'cause');
            if (!descriptor) break;
            if (!descriptor.enumerable) {
                Object.defineProperty(error, 'cause', {
                    ...descriptor,
                    enumerable: true,
                });
            }
            error = error.cause;
        }
    }
}

/**
 * Keeps error causes in warnings and errors sent to Sentry Logs. Call it after `Sentry.init`,
 * so it runs before Sentry's console handler formats the arguments.
 */
export function keepErrorCausesInLogs() {
    for (const level of ['error', 'warn'] as const) {
        const log = console[level];
        console[level] = (...args: unknown[]) => {
            exposeErrorCauses(args);
            log(...args);
        };
    }
}

export const ConsoleLogger: Logger = {
    fatal: (...args: Logs) => console.error(...args),
    error: (...args: Logs) => console.error(...args),
    warn: (...args: Logs) => console.warn(...args),
    info: (...args: Logs) => console.info(...args),
    debug: (...args: Logs) => console.debug(...args),
    trace: (...args: Logs) => console.log(...args),
};

type Handler = (...args: Logs) => void;

export type Logs = unknown[];

export class ScopedLogger implements Logger {
    private prefixes: string[];

    constructor(...prefixes: string[]) {
        this.prefixes = prefixes;
    }
    private getPrefixesString(): string {
        return this.prefixes.map((i) => `[${i}]`).join('');
    }
    public extendScope(prefix: string) {
        return new ScopedLogger(...this.prefixes, prefix);
    }

    public isConsoleEnabled = true;

    public disableConsole() {
        this.isConsoleEnabled = false;
        return this;
    }

    fatal = (...args: Logs) => {
        if (this.isConsoleEnabled)
            console.error(this.getPrefixesString(), ...args);
        this.callHandlers('*', this.getPrefixesString(), ...args);
    };
    error = (...args: Logs) => {
        if (this.isConsoleEnabled)
            console.error(this.getPrefixesString(), ...args);
        this.callHandlers('*', this.getPrefixesString(), ...args);
    };
    warn = (...args: Logs) => {
        if (this.isConsoleEnabled)
            console.warn(this.getPrefixesString(), ...args);
        this.callHandlers('*', this.getPrefixesString(), ...args);
    };
    info = (...args: Logs) => {
        if (this.isConsoleEnabled)
            console.info(this.getPrefixesString(), ...args);
        this.callHandlers('*', this.getPrefixesString(), ...args);
    };
    debug = (...args: Logs) => {
        if (this.isConsoleEnabled)
            console.debug(this.getPrefixesString(), ...args);
        this.callHandlers('*', this.getPrefixesString(), ...args);
    };
    trace = (...args: Logs) => {
        if (this.isConsoleEnabled)
            console.log(this.getPrefixesString(), ...args);
        this.callHandlers('*', this.getPrefixesString(), ...args);
    };

    private callHandlers(event: '*', ...args: Logs) {
        for (const handler of this.handlers[event] ?? []) {
            try {
                handler(...args);
                // eslint-disable-next-line @typescript-eslint/no-unused-vars
            } catch (err) {}
        }
    }

    private handlers: Record<string, Handler[]> = {};

    public addEventListener(event: '*', handler: Handler) {
        if (!this.handlers[event]) this.handlers[event] = [];

        this.handlers[event].push(handler);
    }
    public removeEventListener(event: '*', handler: Handler) {
        this.handlers[event] = this.handlers[event]?.filter(
            (i) => i !== handler
        );
    }
}
