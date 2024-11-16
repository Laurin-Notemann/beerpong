export const seconds = (seconds: number) => seconds * 1000;

export const minutes = (minutes: number) => seconds(minutes * 60);

export const hours = (hours: number) => minutes(hours * 60);
