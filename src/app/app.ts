import { Component } from '@angular/core';
import { AppShellComponent } from './layout/app-shell/app-shell.component';

@Component({
  selector: 'rally-root',
  imports: [AppShellComponent],
  templateUrl: './app.html',
  styleUrl: './app.scss',
})
export class App {}
