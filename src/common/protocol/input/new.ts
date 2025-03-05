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
  /** Whether the event is a repeat event. */
  repeat: boolean;
  /** The key pressed, see the docs on JS's `KeyboardEvent.code` for a description. */
  code: string;
  /** The held modifiers. */
  modifiers: KeyModifiers;
}

/** The held modifiers. */
export interface KeyModifiers {
  /** Whether the alt key is held. */
  alt: boolean;
  /** Whether the ctrl key is held. */
  ctrl: boolean;
  /** Whether the meta key is held. */
  meta: boolean;
  /** Whether the shiftKey key is held. */
  shift: boolean;
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

/** Base type for gamepad/controller payloads. */
interface BaseGamepadEvent<Control extends string> extends BaseInputEvent<'gamepad'> {
  /** The type of control. */
  control: Control;
  /**
   * The (control-specific) index of the control.
   * 
   * This corresponds to the standard layout specified in
   * https://www.w3.org/TR/gamepad/#dfn-standard-gamepad.
   */
  index: number;
}

/** A button event on the gamepad. */
export interface GamepadButtonEvent extends BaseGamepadEvent<'button'> {
  /** Whether the button is pressed. */
  down: boolean;
  /** The value of the button (between 0.0 and 1.0, modeled after the Web Gamepad API) */
  value: number;
}

/** A 1D axis event on the gamepad. */
export interface GamepadAxisEvent extends BaseGamepadEvent<'axis'> {
  /** The value of the axis (between -1.0 and 1.0, modeled after the Web Gamepad API) */
  value: number;
}

/** A 2D axis event on the gamepad. */
export interface GamepadAxis2DEvent extends BaseGamepadEvent<'axis2d'> {
  /** The 2D value of the axes. */
  value: {
    /** The value on the x-axis (between -1.0 and 1.0, modeled after the Web Gamepad API) */
    x: number,
    /** The value on the y-axis (between -1.0 and 1.0, modeled after the Web Gamepad API) */
    y: number,
  },
}

/** A game/controller event payload. */
export type GamepadEvent = GamepadButtonEvent | GamepadAxisEvent | GamepadAxis2DEvent;

/** An input event payload. */
export type InputEvent = KeyEvent | MouseEvent | GamepadEvent;
