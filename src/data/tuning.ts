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

export const WORLD = {
  /**
   * Turn the coast round: sea to the right, land to the left. Positions are
   * mirrored, pictures are not. See docs/19-changing-things-safely.md (T24).
   */
  mirror: false,
};

export const HIDE = {
  /** Hide starts when the edge of a cover is within this many BL. */
  reach: 1.5,
  /** The shrimp tucks in this far from the cover's centre, as a share of its radius. */
  tuck: 0.45,
  /** Closer than this to the tuck point, in BL, it is tucked in. */
  settled: 0.12,
  /** Within this many BL of the tuck point it slows to a stop. */
  slowing: 0.35,
};

export const COVER = {
  /** Opacity of a cover while the player is beneath it. */
  fadedAlpha: 0.4,
  /** Seconds to fade or come back. */
  fadeTime: 0.3,
};

export const WATER_LIGHT = {
  /** How fast the light patches slide, in design pixels per second. */
  dappleDrift: { x: 6, y: 3.5 },
};

/** Hunger. See docs/10-feelings-and-states.md, "Hunger". */
export const HUNGER = {
  /** Per second while walking: empty to full in 4 minutes. */
  walkRate: 1 / 240,
  restFactor: 0.5,
  /** While hidden, burrowed or resting. */
  stillFactor: 0.3,
  swimFactor: 1.2,
  larvaRate: 1 / 120,
  tailFlip: 0.006,
  peckish: 0.5,
  veryHungry: 0.9,
  /** Hunger when a chapter starts. The first hunger comes about 20 s after walking off. */
  start: { drift: 0.65, mangrove: 0.62, other: 0.5 },
};

/** Fear. See docs/10-feelings-and-states.md, "Fear". */
export const FEAR = {
  gains: {
    shadow: 0.3,
    predatorSeen: 0.5,
    missNearby: 0.1,
    alarm: 0.2,
    startle: 0.2,
    engine: 0.2,
    netGrid: 0.15,
  },
  cap: 0.6,
  cornered: 0.9,
  corneredHold: 3,
  softFactor: 2,
  waryFactor: 1.5,
  falls: { open: 0.05, companion: 0.1, restingClose: 0.15, hidden: 0.2, hiddenNearThreat: 0.1 },
  chase: 0.8,
  near: 0.5,
  startleGain: 0.15,
  startleTime: 0.35,
  freezeFear: 0.3,
  freezeAfter: 1,
};

/** Comfort follows a target made from the other feelings. */
export const COMFORT = {
  base: 0.35,
  fed: 0.25,
  sheltered: 0.15,
  company: 0.15,
  settled: 0.1,
  fear: 0.6,
  /** Seconds to rise and to fall. Fright empties it fast, ease returns slowly. */
  rise: 8,
  fall: 2,
  discovery: 0.1,
};

/** Curiosity, and how things are found. */
export const CURIOSITY = {
  rise: 1,
  fall: 3,
  /** At this much fear or more, nothing pulls. */
  fearBlocks: 0.5,
  /** BL. The Sense range, which is also how far curiosity reaches. */
  range: { juvenile: 8, subAdult: 11, adult: 14 },
  weights: { creature: 1, thing: 1, food: 0.8 },
  /** BL and seconds to find each kind of thing. */
  find: {
    creature: { distance: 2.5, seconds: 2 },
    thing: { distance: 1.5, seconds: 1 },
  },
};

/** Company. Weights by bond stage of every shrimp within `radius` BL. */
export const COMPANY = {
  radius: 4,
  weights: { stranger: 0.3, familiar: 0.45, companion: 0.7, close: 1 },
  rise: 2,
  fall: 20,
};

/** Wariness after a fright. Seconds. */
export const WARY = {
  afterFright: 20,
  afterCornered: 40,
  afterStartle: 10,
  /** Seconds hidden that end it early. */
  restEnds: 10,
};

/** Which mood leads, and how fast it changes. See doc 10, "Mood". */
export const MOOD = {
  afraid: { enter: 0.5, leave: 0.4 },
  hungry: { enter: 0.7, leave: 0.55 },
  curious: { enter: 0.6, leave: 0.45 },
  social: { enter: 0.6, leave: 0.45 },
  contentAfter: 5,
  newHolds: 0.4,
  oldHolds: 1.5,
  /** Seconds the body takes to change: into afraid, and otherwise. */
  bodyAfraid: 0.3,
  body: 0.6,
  /** The screen never changes faster than this. */
  screen: 0.5,
};

/** The feelings tuning in one object, as `FeelingsModel` takes it. */
export const FEELINGS = {
  hunger: HUNGER,
  fear: FEAR,
  comfort: COMFORT,
  curiosity: CURIOSITY,
  company: COMPANY,
  wary: WARY,
};

/** How the screen shows the player's mood. See doc 10, "Screen". */
export const MOOD_SCREEN = {
  /** Share of colour taken away. */
  desaturate: { hungry: 0.1, afraid: 0.25 },
  /** A wash of colour, and how strong. */
  warm: { color: 0xf2d58a, amount: 0.08 },
  cool: { color: 0x9fb6c9, amount: 0.1 },
  /** Extra zoom when afraid. Off with reduced motion. */
  afraidZoom: 0.08,
  /** Share of the way the view leans toward what the shrimp is curious about. */
  curiousLean: 0.05,
  /** Strength of the dark edges: afraid, and the share left while wary. */
  afraidEdges: 1,
  waryEdges: 1 / 3,
  /** Content lightens the usual edges by this share. */
  contentLighter: 0.35,
  /** Seconds a mood's name stays on screen, with "Name feelings on screen". */
  nameSeconds: 2.5,
};
