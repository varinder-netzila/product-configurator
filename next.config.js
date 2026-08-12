/** @type {import('next').NextConfig} */
const nextConfig = {
  env: {
    SHOPIFY_API_KEY: process.env.SHOPIFY_API_KEY,
    SHOPIFY_API_SECRET: process.env.SHOPIFY_API_SECRET,
    SHOPIFY_SCOPES: process.env.SHOPIFY_SCOPES,
    SHOPIFY_APP_URL: process.env.SHOPIFY_APP_URL,
  },
  async headers() {
    return [
      {
        source: '/api/:path*',
        headers: [
          { key: 'Access-Control-Allow-Origin', value: '*' },
          { key: 'Access-Control-Allow-Methods', value: 'GET, POST, PUT, DELETE, OPTIONS' },
          { key: 'Access-Control-Allow-Headers', value: 'Content-Type, Authorization' },
        ],
      },
    ];
  },
  typescript: {
    ignoreBuildErrors: true,
  }
};

const { withSentryConfig } = require('@sentry/nextjs');

module.exports = withSentryConfig(nextConfig, {
  silent: true,
  org: process.env.SENTRY_ORG,
  project: process.env.SENTRY_PROJECT,
  dryRun: !process.env.SENTRY_AUTH_TOKEN,
  disableLogger: true,
});
