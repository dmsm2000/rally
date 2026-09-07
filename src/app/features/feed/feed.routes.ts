import { Routes } from '@angular/router';
import { FeedPageComponent } from './pages/feed-page/feed-page.component';
import { PostDetailPageComponent } from './pages/post-detail-page/post-detail-page.component';

export const FEED_ROUTES: Routes = [{ path: '', component: FeedPageComponent }];

/** Public — registered outside the shell in app.routes.ts. See PostDetailPageComponent for why. */
export const POST_DETAIL_ROUTES: Routes = [{ path: ':postId', component: PostDetailPageComponent }];
