import { Component, OnInit, inject } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { SplashScreenComponent } from './layout/splash-screen/splash-screen.component';
import { TwemojiRendererService } from './core/services/twemoji-renderer.service';
import { ConfirmDialogComponent, MediaLightboxComponent, ToastContainerComponent } from './shared/ui';

@Component({
  selector: 'rally-root',
  imports: [RouterOutlet, SplashScreenComponent, ToastContainerComponent, ConfirmDialogComponent, MediaLightboxComponent],
  templateUrl: './app.html',
  styleUrl: './app.scss'
})
export class App implements OnInit {
  private readonly twemoji = inject(TwemojiRendererService);

  ngOnInit(): void {
    this.twemoji.start();
  }
}
