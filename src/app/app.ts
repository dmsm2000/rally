import { Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { SplashScreenComponent } from './layout/splash-screen/splash-screen.component';
import { ToastContainerComponent } from './shared/ui';

@Component({
  selector: 'rally-root',
  imports: [RouterOutlet, SplashScreenComponent, ToastContainerComponent],
  templateUrl: './app.html',
  styleUrl: './app.scss'
})
export class App {}
