import { Component, inject } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { AuthService } from '../../core/auth/auth.service';
import { TopbarComponent } from '../topbar/topbar.component';
import { BottomNavComponent } from '../bottom-nav/bottom-nav.component';
import { MessagesWidgetComponent } from '../../features/messages/messages-widget/messages-widget.component';

@Component({
  selector: 'rally-shell',
  imports: [RouterOutlet, TopbarComponent, BottomNavComponent, MessagesWidgetComponent],
  templateUrl: './app-shell.component.html',
  styleUrl: './app-shell.component.scss',
})
export class AppShellComponent {
  protected readonly auth = inject(AuthService);
}
