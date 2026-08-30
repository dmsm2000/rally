export type NotificationKind = 'message' | 'match' | 'trip' | 'achievement';

export interface AppNotification {
  id: string;
  kind: NotificationKind;
  text: string;
  detail?: string;
  time: string;
  read: boolean;
  /** Router path to open when the notification is clicked. */
  link: string;
  /** Present for player-related notifications so the panel can render their avatar. */
  playerId?: string;
}
