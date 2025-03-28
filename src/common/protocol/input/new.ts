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
  /** Whether the mouse pointer was locked (e.g. to the frontend's canvas). */
  pointerLocked: boolean;
  /** The mouse button. */
  button: 'left' | 'middle' | 'right'; // TODO: Support more buttons
  /** The position. */
  pos: {
    /** The x-coordinate in terms of lighthouse columns, i.e. in the range 0-28. */
    x: number;
    /** The y-coordinate in terms of lighthouse rows, i.e. in the range 0-14. */
    y: number;
  };
  /** The movement of the mouse position. Useful e.g. for pointer-locked apps like games. */
  movement: {
    /** The movement on the x-axis. Expressed in terms of lighthouse columns, but may be negative. */
    x: number;
    /** The movement on the y-axis. Expressed in terms of lighthouse rows, but may be negative. */
    y: number;
  },
}

/** Base type for gamepad/controller payloads. */
interface BaseGamepadEvent<Control extends string> extends BaseInputEvent<'gamepad'> {
  /** The type of control. */
  control: Control;
  /**
   * The (control-specific) index of the control.
   * 
   * Buttons correspond to the standard layout specified in
   * https://www.w3.org/TR/gamepad/#dfn-standard-gamepad.
   * 
   * Axes are mapped slightly differently:
   * 
   * | Web API Standard Gamepad    | This API       |
   * | --------------------------- | -------------- |
   * | Axis 0 (left stick x-axis)  | Axis2D 0       |
   * | Axis 1 (left stick y-axis)  | Axis2D 0       |
   * | Axis 2 (right stick x-axis) | Axis2D 1       |
   * | Axis 3 (right stick y-axis) | Axis2D 1       |
   * | Axis n (for n >= 4)         | Axis   (n - 4) |
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

/** A MIDI event payload. */
export interface MIDIEvent extends BaseInputEvent<'midi'> {
  /**
   * The binary MIDI message.
   * 
   * The first byte is a status byte (first/most significant bit = 1), the
   * remaining bytes are data bytes (first/most significant bit = 0).
   * 
   * To give a simple example, pressing C5 on a MIDI keyboard would generate the
   * following message:
   * 
   *     [0x90,     0x48,     0x64]
   *      Ch.1    Note 72   Velocity 100
   *     NoteOn   i.e. C5
   * 
   * The note values can be looked up online:
   * 
   * - https://www.phys.unsw.edu.au/jw/notes.html
   * 
   * Same goes for a full description of the packet structure:
   * 
   * - https://www.w3.org/TR/webmidi/#terminology
   * - http://www.opensound.com/pguide/midi/midi5.html
   * - https://www.songstuff.com/recording/article/midi-message-format/
   */
  data: Uint8Array;
}

/**
 * A device orientation event payload.
 * 
 * Modeled after https://developer.mozilla.org/de/docs/Web/API/DeviceOrientationEvent.
 */
export interface OrientationEvent extends BaseInputEvent<'orientation'> {
  /** Whether the device provides absolute orientation data. */
  absolute: boolean | null;
  /** The motion of the device around the z-axis, in degrees from 0 (inclusive) to 360 (exclusive). */
  alpha: number | null;
  /** The motion of the device around the x-axis (front to back motion), in degrees from -180 (inclusive) to 180 (exclusive). */
  beta: number | null;
  /** The motion of the device around the y-axis (left to right motion), in degrees from -90 (inclusive) to 90 (exclusive). */
  gamma: number | null;
}

/**
 * A device motion event payload.
 * 
 * Modeled after https://developer.mozilla.org/de/docs/Web/API/DeviceMotionEvent.
 */
export interface MotionEvent extends BaseInputEvent<'motion'> {
  /** The acceleration of the device in m/s^2 (in 3D space). */
  acceleration: {
    /** The acceleration on the x-axis. */
    x: number | null;
    /** The acceleration on the y-axis. */
    y: number | null;
    /** The acceleration on the z-axis. */
    z: number | null;
  } | null,
  /** The acceleration of the device, including gravity, in m/s^2 (in 3D space). */
  accelerationIncludingGravity: {
    /** The acceleration on the x-axis (west to east). */
    x: number | null;
    /** The acceleration on the y-axis (south to north). */
    y: number | null;
    /** The acceleration on the z-axis (down to up). */
    z: number | null;
  } | null,
  /** The rotation rate in deg/s on the three rotation axes alpha, beta and gamma. */
  rotationRate: {
    /** The rate at which the device rotates about its z-axis (i.e. is twisted around a line perpendicular to its screen.) */
    alpha: number | null;
    /** The rate at which the device rotates about its x-axis (i.e. front to back) */
    beta: number | null;
    /** The rate at which the device rotates about its y-axis (i.e. side to side) */
    gamma: number | null;
  } | null,
  /** The granularity of these events in ms. */
  interval: number;
}

/** An input event payload. */
export type InputEvent = KeyEvent | MouseEvent | GamepadEvent | MIDIEvent | OrientationEvent | MotionEvent;
