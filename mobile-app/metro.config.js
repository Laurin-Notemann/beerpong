const { getSentryExpoConfig } = require('@sentry/react-native/metro');

// eslint-disable-next-line no-undef
const config = getSentryExpoConfig(__dirname);

// we can't include any vitest imports in our bundle because they crash the metro build
config.resolver.blacklistRE = /.*\.test\.(ts|tsx)$/;

module.exports = config;
