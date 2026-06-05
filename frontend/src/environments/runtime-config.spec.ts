import { getRuntimeConfig } from './runtime-config';

describe('getRuntimeConfig', () => {
  afterEach(() => {
    delete window.__AHEDNA_CONFIG__;
  });

  it('falls back to /api when no runtime config exists', () => {
    expect(getRuntimeConfig()).toEqual({
      apiUrl: '/api',
    });
  });

  it('normalizes trailing slashes from the runtime API URL', () => {
    window.__AHEDNA_CONFIG__ = {
      apiUrl: 'https://api.example.org/api///',
    };

    expect(getRuntimeConfig()).toEqual({
      apiUrl: 'https://api.example.org/api',
    });
  });

  it('falls back to /api when the runtime value is empty', () => {
    window.__AHEDNA_CONFIG__ = {
      apiUrl: '   ',
    };

    expect(getRuntimeConfig()).toEqual({
      apiUrl: '/api',
    });
  });
});
