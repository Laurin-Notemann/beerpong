const tempStore = new Map<string, unknown>();

let counter = 0;

export function putTemp<T>(value: T): string {
    const key = `${Date.now()}_${counter++}`;
    tempStore.set(key, value as unknown);
    return key;
}

export function getTemp<T>(key: string): T | undefined {
    return tempStore.get(key) as T | undefined;
}

export function deleteTemp(key: string): void {
    tempStore.delete(key);
}
