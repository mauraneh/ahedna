import { getRuntimeConfig } from './runtime-config';

export const environment = {
  production: true,
  apiUrl: getRuntimeConfig().apiUrl
};
