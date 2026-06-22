import { getRuntimeConfig } from './runtime-config';

export const environment = {
  production: false,
  apiUrl: getRuntimeConfig().apiUrl,
  cmsUrl: getRuntimeConfig().cmsUrl
};
