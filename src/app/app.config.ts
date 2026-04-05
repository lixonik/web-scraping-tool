import { ApplicationConfig, provideBrowserGlobalErrorListeners }              from '@angular/core';
import { PreloadAllModules, provideRouter, withDebugTracing, withPreloading } from '@angular/router';
import { provideHttpClient }                                                  from '@angular/common/http';
import { APP_ROUTES }                                                         from './routing';

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    provideHttpClient(),
    provideRouter(APP_ROUTES, withPreloading(PreloadAllModules),
      // withDebugTracing()
    )
  ]
};
