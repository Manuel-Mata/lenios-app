import { Routes } from '@angular/router';
import { adminGuard } from './guards/admin.guard';

export const routes: Routes = [
  { path: '', redirectTo: 'catalogo', pathMatch: 'full' },
  {
    path: 'catalogo',
    loadComponent: () =>
      import('./components/catalogo/catalogo.component').then((m) => m.CatalogoComponent),
  },
  {
    path: 'carrito',
    loadComponent: () =>
      import('./components/carrito/carrito.component').then((m) => m.CarritoComponent),
  },
  {
    path: 'login',
    loadComponent: () =>
      import('./components/auth/auth.component').then((m) => m.AuthComponent),
  },
  {
    path: 'admin',
    loadComponent: () =>
      import('./components/admin/admin-dashboard.component').then(
        (m) => m.AdminDashboardComponent
      ),
    canActivate: [adminGuard],
  },
  { path: '**', redirectTo: 'catalogo' },
];
