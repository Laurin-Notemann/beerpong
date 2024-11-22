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

export const ConsoleLogger: Logger = {
    fatal: (...args: Logs) => console.error(...args),
    error: (...args: Logs) => console.error(...args),
    warn: (...args: Logs) => console.warn(...args),
    info: (...args: Logs) => console.info(...args),
    debug: (...args: Logs) => console.debug(...args),
    trace: (...args: Logs) => console.log(...args),
};

type Handler = (...args: Logs) => void;

export type Logs = any[];

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

    fatal = (...args: Logs) => {
        console.error(this.getPrefixesString(), ...args);
        this.callHandlers('*', ...args);
    };
    error = (...args: Logs) => {
        console.error(this.getPrefixesString(), ...args);
        this.callHandlers('*', ...args);
    };
    warn = (...args: Logs) => {
        console.warn(this.getPrefixesString(), ...args);
        this.callHandlers('*', ...args);
    };
    info = (...args: Logs) => {
        console.info(this.getPrefixesString(), ...args);
        this.callHandlers('*', ...args);
    };
    debug = (...args: Logs) => {
        console.debug(this.getPrefixesString(), ...args);
        this.callHandlers('*', ...args);
    };
    trace = (...args: Logs) => {
        console.log(this.getPrefixesString(), ...args);
        this.callHandlers('*', ...args);
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
