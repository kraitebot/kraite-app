export const NOTICE_OVERLAY_PLACEMENT = Object.freeze({
  position: 'absolute' as const,
  left: 16,
  right: 16,
  zIndex: 1100,
  elevation: 1100,
});

export const NOTICE_SWIPE_ACTIVATION_DISTANCE = 7;
export const NOTICE_SWIPE_DISMISS_DISTANCE = 64;
export const NOTICE_SWIPE_DISMISS_VELOCITY = 0.7;

export function noticeSwipeShouldDismiss(dx: number, dy: number, vx: number, vy: number): boolean {
  return Math.hypot(dx, dy) >= NOTICE_SWIPE_DISMISS_DISTANCE
    || Math.hypot(vx, vy) >= NOTICE_SWIPE_DISMISS_VELOCITY;
}

export const NOTICE_TONE_ICONS = Object.freeze({
  error: 'alert-circle-outline',
  warning: 'warning-outline',
  info: 'information-circle-outline',
  success: 'checkmark-circle-outline',
} as const);

export type NoticeTone = keyof typeof NOTICE_TONE_ICONS;
