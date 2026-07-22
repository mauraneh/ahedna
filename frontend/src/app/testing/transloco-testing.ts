import { EnvironmentProviders } from '@angular/core';
import { TranslocoLoader, provideTransloco } from '@jsverse/transloco';
import { of } from 'rxjs';

export class TranslocoTestingLoader implements TranslocoLoader {
  getTranslation() {
    return of({});
  }
}

export function provideTranslocoTesting(
  loader: new (...args: never[]) => TranslocoLoader = TranslocoTestingLoader
): EnvironmentProviders[] {
  return provideTransloco({
    config: {
      availableLangs: ['fr', 'en'],
      defaultLang: 'fr',
      reRenderOnLangChange: true,
      prodMode: true,
    },
    loader,
  });
}
