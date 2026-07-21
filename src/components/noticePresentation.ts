export const NOTICE_OVERLAY_PLACEMENT = Object.freeze({
  position: 'absolute' as const,
  left: 16,
  right: 16,
  zIndex: 1100,
  elevation: 1100,
});

export const NOTICE_TONE_ICONS = Object.freeze({
  error: 'alert-circle-outline',
  warning: 'warning-outline',
  info: 'information-circle-outline',
  success: 'checkmark-circle-outline',
} as const);

export type NoticeTone = keyof typeof NOTICE_TONE_ICONS;
