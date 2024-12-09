const INTERVAL = 100;

export const FIBONACCI_TIMEOUTS: number[] = [
    1 * INTERVAL,
    2 * INTERVAL,
    3 * INTERVAL,
    5 * INTERVAL,
    8 * INTERVAL,
    13 * INTERVAL,
    21 * INTERVAL,
    34 * INTERVAL,
    55 * INTERVAL,
];

export class BackOff {
    private count = 0;

    constructor(private timeouts: number[]) {}

    public get(): number {
        return this.timeouts[this.count];
    }

    public getAndIncrement(): number {
        const result = this.get();
        if (!this.isFull()) {
            this.count += 1;
        }
        return result;
    }

    public reset(newTimeouts?: number[]): void {
        if (newTimeouts !== undefined) {
            this.timeouts = newTimeouts;
        }
        this.count = 0;
    }

    public isFull(): boolean {
        return this.count === this.timeouts.length - 1;
    }

    public getIndex(): number {
        return this.count;
    }
}
