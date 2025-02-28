/** An input event payload from the server. */
interface BaseInputEvent {
  src: number;
  dwn: boolean;
}

/** A key event payload from the server. */
export interface KeyEvent extends BaseInputEvent {
  key: number;
}

/** A controller event payload from the server. */
export interface ControllerEvent extends BaseInputEvent {
  btn: number;
}

export type InputEvent = KeyEvent | ControllerEvent;

/** A user-defined type guard for InputEvent. */
export function isInputEvent(value: any): value is InputEvent {
  return typeof value === 'object' && 'src' in value && 'dwn' in value;
}

/** A user-defined type guard for KeyEvent. */
export function isKeyEvent(value: any): value is KeyEvent {
  return isInputEvent(value) && 'key' in value;
}

/** A user-defined type guard for ControllerEvent. */
export function isControllerEvent(value: any): value is ControllerEvent {
  return isInputEvent(value) && 'btn' in value;
}
