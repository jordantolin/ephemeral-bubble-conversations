
export type NotificationType = 'achievement' | 'reflection' | 'system' | 'level';
export type NotificationIconType = 'star' | 'award' | 'gift';

export interface Notification {
  id: string;
  title: string;
  message: string;
  type: NotificationType;
  read: boolean;
  createdAt: string;
  iconType?: NotificationIconType;
  points?: number;
}
