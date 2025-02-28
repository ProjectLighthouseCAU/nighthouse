/** Base type for input event payloads. */
interface BaseInputEvent<Type extends string> {
  /** The event type. */
  type: Type;
  /** The identifier, unique per client + device combo. */
  source: number | string;
}

/** A keyboard event payload. */
export interface KeyEvent extends BaseInputEvent<'key'> {
  /** Whether the key was pressed. */
  down: boolean;
  /** The key pressed, see the docs on JS's `KeyboardEvent.key` for a description. */
  key: string;
}

/** A mouse event payload. */
export interface MouseEvent extends BaseInputEvent<'mouse'> {
  /** Whether the button was pressed. */
  down: boolean;
  /** The mouse button. */
  button: 'left' | 'middle' | 'right'; // TODO: Support more buttons
  /** The position. */
  pos: {
    /** The x-coordinate in range 0-28. */
    x: number;
    /** The y-coordinate in range 0-14. */
    y: number;
  };
}

/** A gamepad/controller payload. */
export interface GamepadEvent extends BaseInputEvent<'gamepad'> {
  /** The buttons, modeled after the Web Gamepad API. */
  buttons: {
    /** Whether the button is pressed. */
    pressed: boolean;
    /** The button's value, between 0.0 and 1.0. */
    value: number;
  }[];
  /** The axes as a list of floats between -1.0 and 1.0, modeled after the Web Gamepad API. */
  axes: number[];
}

/** An input event payload. */
export type InputEvent = KeyEvent | MouseEvent | GamepadEvent;
