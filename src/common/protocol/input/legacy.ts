/** An input event payload from the server. */
interface BaseLegacyInputEvent {
  src: number;
  dwn: boolean;
}

/** A key event payload from the server. */
export interface LegacyKeyEvent extends BaseLegacyInputEvent {
  key: number;
}

/** A controller event payload from the server. */
export interface LegacyControllerEvent extends BaseLegacyInputEvent {
  btn: number;
}

export type LegacyInputEvent = LegacyKeyEvent | LegacyControllerEvent;

/** A user-defined type guard for LegacyInputEvent. */
export function isLegacyInputEvent(value: any): value is LegacyInputEvent {
  return typeof value === 'object' && 'src' in value && 'dwn' in value;
}

/** A user-defined type guard for LegacyKeyEvent. */
export function isLegacyKeyEvent(value: any): value is LegacyKeyEvent {
  return isLegacyInputEvent(value) && 'key' in value;
}

/** A user-defined type guard for LegacyControllerEvent. */
export function isLegacyControllerEvent(value: any): value is LegacyControllerEvent {
  return isLegacyInputEvent(value) && 'btn' in value;
}
