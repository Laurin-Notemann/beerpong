interface ImportMetaEnv {
    /** Sentry DSN of the TV's pages and the server (tv/sentry.ts, serverSentry.ts); set by the staging image build */
    readonly VITE_SENTRY_DSN?: string;
    /** the commit the image was built from, for Sentry's release */
    readonly VITE_GIT_COMMIT?: string;
}
