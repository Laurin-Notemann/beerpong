const { getDefaultConfig } = require('expo/metro-config');

// eslint-disable-next-line
const config = getDefaultConfig(__dirname);

config.resolver.blacklistRE = /.*\.test\.(ts|tsx)$/;

module.exports = config;
