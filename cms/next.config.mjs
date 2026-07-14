import path from 'node:path';
import { withPayload } from '@payloadcms/next/withPayload';

const nextConfig = {
  webpack: (config) => {
    config.resolve.alias = {
      ...config.resolve.alias,
      '@payload-config': path.resolve(process.cwd(), 'payload.config.js'),
    };

    return config;
  },
};

export default withPayload(nextConfig);
