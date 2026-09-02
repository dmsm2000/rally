/** Extend as new features start emitting real notifications (see supabase/migrations/0017_notifications.sql). */
export type NotificationKind = 'trip_host_volunteered';

export interface AppNotification {
  id: string;
  kind: NotificationKind;
  /** Who triggered it, for the bell's avatar — absent for system-generated notifications. */
  actorId?: string;
  /** Kind-specific rendering payload, snapshotted at creation time (e.g. city/dates for a trip). */
  data: Record<string, string>;
  read: boolean;
  createdAt: string;
}
