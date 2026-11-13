import type { MotionTuning } from '../core/movement/ShrimpMotion';

/**
 * Every number that shapes how the game feels. Starting points for playtests.
 * See docs/02-mechanics.md. BL means one body length of the shrimp.
 */
const DEGREES = Math.PI / 180;

/** Length of the juvenile shrimp on screen, in design pixels. */
export const BODY_LENGTH_PX = 110;

export const MOTION: MotionTuning = {
  bodyLengthPx: BODY_LENGTH_PX,
  radius: 0.26,
  turnRate: 540 * DEGREES,
  walkSpeed: 1.5,
  swimSpeed: 2.5,
  walkToSwim: 0.8,
  moveGrace: 0.15,
  coastTime: 0.6,
  walkAccelTime: 0.15,
  swimAccelTime: 0.35,
  dartDistance: 3,
  dartTime: 0.25,
  glideDistance: 0.6,
  glideTime: 0.35,
  dartTurnRate: 2400 * DEGREES,
  dartCooldown: 0.8,
  dartsBeforeTiring: 3,
  dartRowWindow: 2.5,
  recoveryTime: 4,
  tiredDartFactor: 0.5,
  dartHeight: 1.6,
  liftTime: 0.22,
};

export const FRAME = {
  /** The longest frame the game will play in full, in seconds. Anything longer is cut short. */
  longest: 0.25,
  /** Longer frames are played as steps of at most this many seconds. */
  step: 1 / 30,
};

export const CAMERA = {
  /**
   * How much the view is enlarged. At 1.4 the juvenile is about 155 pixels long
   * on a 1080p screen, large enough to read its posture and antennae.
   */
  zoom: 1.4,
  /** Seconds for the view to catch up with the shrimp. */
  followTime: 0.28,
  /** How far ahead of the shrimp the view looks, in seconds of travel. */
  lookAheadTime: 0.35,
  /** The most the view leads the shrimp, in BL. */
  lookAheadMax: 1.4,
};

export const SHADOW = {
  /** Where the light comes from: shadows fall down and to the right. */
  directionX: 0.6,
  directionY: 0.8,
  /** Offset of the shadow on the bed, in pixels. */
  contactPx: 3,
  /** Extra offset per unit of height, in BL. */
  perHeight: 0.17,
};
