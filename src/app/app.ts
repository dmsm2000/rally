import { Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { SplashScreenComponent } from './layout/splash-screen/splash-screen.component';

@Component({
  selector: 'rally-root',
  imports: [RouterOutlet, SplashScreenComponent],
  templateUrl: './app.html',
  styleUrl: './app.scss'
})
export class App {}
