import { Routes } from '@angular/router';

export const APP_ROUTES: Routes = [
  // {
  //   path: 'pokemon',
  //   loadComponent: () => import('./pokemon/pokemon/pokemon.component')
  //     .then(mod => mod.PokemonComponent)
  // },
  {
    path: 'home',
    loadComponent: () =>
      import('./home.component').then((mod) => mod.HomeComponent),
  },
  {
    path: '**',
    loadComponent: () =>
      import('./page-not-found.component').then(
        (mod) => mod.PageNotFoundComponent,
      ),
  },
];
