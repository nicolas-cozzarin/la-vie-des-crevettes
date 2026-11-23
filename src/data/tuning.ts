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
  /** The target of the challenge pinned in the journal. */
  pinned: 0.6,
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
  /** Social: how much brighter the other shrimp are drawn (T74). */
  socialLift: 0.07,
};

/** Grazing. See doc 10, "Activities". BL are from the shrimp's centre. */
export const GRAZE = {
  /** BL. Interact starts a graze when the mouth is this close to a patch's edge. */
  reach: 0.6,
  /** BL. Where the mouth is, ahead of the centre. */
  head: 0.4,
  /** Below this hunger the shrimp is full and stops grazing. */
  full: 0.15,
  /** Seconds a full shrimp may still try a food it has not tasted. */
  taste: 1,
  /** At this fear or more, grazing and sensing end at once. */
  fearEnds: 0.5,
  /** Share of a food picture's width that holds food. */
  patchShare: 0.4,
  /** Seconds of the first-taste wiggle (doc 14). */
  wiggle: 0.8,
};

/** Sense and its ribbons. See doc 02, "Sense", and doc 11, "Scent ribbons". */
export const SENSE = {
  /** At most this many white ribbons, nearest first. */
  maxUnknown: 3,
  /** Share of a ribbon's strength lost at the edge of the range. */
  fade: 0.65,
  /** Seconds for the ribbons to come and to go. */
  fadeTime: 0.4,
  /** A hungry shrimp sees food ribbons this close without Sense, BL, and how faint. */
  hungryReach: 5,
  hungryStrength: 0.3,
  /** Seconds a shown food ribbon counts as followed when its patch is grazed. */
  followWindow: 30,
  /** How much the view dims while sensing. */
  dim: 0.15,
  /** BL. How thick a ribbon is drawn, and how far it sways. */
  width: 0.3,
  sway: 0.25,
};

/** Greeting and calling. See doc 10, "Activities". */
export const GREET = {
  /** BL. Greet starts when another shrimp is this close. */
  reach: 2,
  /** Seconds the antennae reach and tap twice. */
  seconds: 0.9,
  /** Seconds Greet is held, with nobody within reach, before calling starts. */
  callHold: 0.6,
  /** BL. Companions this close start to come when called. */
  callReach: 14,
  /** Seconds a greeting with a bonded companion takes off wariness. */
  easesWary: 10,
};

/** The bond with each other shrimp. See doc 02, "Bonds". */
export const BOND = {
  greet: 0.05,
  greetEvery: 30,
  grazeNear: 0.03,
  grazeSeconds: 10,
  /** BL. */
  grazeReach: 3,
  shareCover: 0.08,
  shareEvery: 60,
  flee: 0.1,
  molt: 0.15,
  stages: { familiar: 0.25, companion: 0.5, close: 0.8 },
};

/** Other shrimp: how they choose, and how they treat the player. See doc 10, "Other shrimp". */
export const NPC = {
  decideEvery: 0.5,
  keep: 0.15,
  flee: { base: 0.3, perBoldness: 0.4, darts: 3, swim: 2 },
  hide: { fear: 0.3, reach: 1.5, calm: 0.15, holdFactor: 1.5, holdScale: 3 },
  freeze: { score: 0.9, afterAlarm: 1 },
  graze: { stop: 0.2, range: 8 },
  greet: { base: 3, perSociability: 5, every: 30, touch: 1.2, giveUp: 8 },
  follow: { called: 0.9, near: 1.5, far: 3, seconds: 20, shoalFactor: 0.5, shoalSpan: 6 },
  groom: { factor: 0.5, min: 3, max: 6 },
  rest: { factor: 0.6, lagoonDay: 0.4, min: 3, span: 9 },
  wander: { base: 0.3, perActivity: 0.3, reach: 6, home: 8, giveUp: 10, waryCover: 3 },
  /** A Stranger keeps this far from the player, in BL, and backs off this far when rushed. */
  stranger: { keep: 1.2, backOff: 3.5, rushed: 2 },
  /** BL. A tail flip this close startles a Stranger. */
  startleReach: 1.5,
  /** BL between two shrimp's middles, below which they are pushed apart. */
  apart: 0.7,
  /** Hunger when an area opens: a random value between these. */
  hunger: { min: 0.2, max: 0.55 },
  /** A walk is a run of steps, then a pause. Seconds; the pause grows as activity falls. */
  walk: { on: 0.7, off: 0.2, offIdle: 0.6, strength: 0.75 },
  /** Afraid: short bursts, then stillness. */
  afraidWalk: { on: 0.35, off: 0.8 },
  /** Seconds of no progress before a walk is given up. */
  stuck: 1.5,
  /** BL beyond the view's edge where another shrimp is still drawn and stepped in full. */
  awake: 4,
  /** Seconds between steps for a shrimp far outside the view. */
  farStep: 0.25,
};

/** How other shrimp find their way. */
export const STEER = {
  look: 1.2,
  tryStep: Math.PI / 9,
  arrive: 0.35,
};

/** Fright passing through a group. See doc 10, "Alarm". */
export const ALARM = {
  reach: 5,
  delayMin: 0.15,
  delayMax: 0.4,
  every: 5,
};

/** The shoal's pulls, from chapter 2. See doc 10, "The shoal". */
export const SHOAL = {
  middle: 4,
  apart: 0.8,
  toMiddle: 0.6,
  away: 0.8,
  along: 0.2,
};

/** The animals that move in the areas. See doc 11, "Mangrove creatures". */
export const CREATURES = {
  crab: {
    wave: 2,
    bout: { min: 4, max: 5 },
    rest: { min: 4, max: 8 },
    side: 0.35,
    sideSpeed: 0.25,
    out: 8,
    outSpread: 4,
  },
  snail: {
    speed: 0.05,
    turn: 0.25,
    home: 1.5,
    rushed: 2,
    calm: 4,
    trailStep: 0.06,
    trailPoints: 40,
  },
  /** Doc 11, "Hermit crab". */
  hermit: {
    speed: 0.5,
    run: { min: 0.3, max: 0.7 },
    pause: { min: 1, max: 3 },
    turn: 1.2,
    home: 2,
    rushed: 1.5,
    calm: 4,
    outTime: 1,
    gentle: 1,
  },
  fish: {
    spread: 1.9,
    wide: 1.3,
    deep: 0.8,
    sway: 0.12,
    burst: 5,
    pull: 1.5,
    drag: 2.4,
    reach: 5,
  },
  /** How bright the pale rim on a curiosity target is, and its width in pixels (doc 11, `fx.rim`). */
  rim: { color: 0xf4f1e4, strength: 0.35, width: 6 },
};

/** The threat director (doc 10, "Threats"). Seconds unless said. */
export const THREAT = {
  gap: 60,
  roll: 10,
  meanWait: 150,
  /** BL. */
  coverWithin: 5,
  cue: { min: 2, max: 3 },
  presence: { min: 5, max: 10 },
  chase: 12,
  cornered: 3.3,
  release: { min: 3, max: 4 },
  notice: { hidden: -1, still: -0.3, walk: 0.35, swim: 0.6, flip: 0.5, far: 0.5, first: 0.5 },
};

/** The wading bird (doc 10, "The wading bird"). Distances in BL, times in seconds. */
export const BIRD = {
  shadowSpeed: 3,
  pass: 1,
  crossBeforeEnd: 1,
  step: 2,
  stepSeconds: 1.2,
  stance: 2.6,
  stand: { min: 4, max: 6, clear: 2 },
  reach: 5,
  ring: { radius: 1, warn: 1, firstWarn: 1.3 },
  lead: 0.25,
  hit: 0.7,
  strikes: 3,
  strikeGap: 2,
  giveUp: { hidden: 2, far: 8, seconds: 12 },
  liftGap: 0.6,
  range: 6,
  sight: 8,
  shadowReach: 3,
  missReach: 3,
  headTurn: 1.6,
  /** The way the first bird's shadow comes from: the north-east, before the coast is turned. */
  firstFrom: -Math.PI / 4,
};

/** Being cornered (doc 10, "Cornered"). Seconds from the instant before contact. */
export const CORNERED = {
  blurred: 0.25,
  flips: 0.25,
  dark: 0.6,
  back: 1.8,
  control: 3.3,
  /** BL. */
  away: 6,
};

/** The narration line (doc 12, "What shows over play"). Seconds. */
export const NARRATION = {
  gap: 20,
  fadeIn: 0.6,
  hold: 4,
  perLetter: 0.06,
  fadeOut: 0.8,
};

/** A place's name when it is first entered (doc 13, "Places"). Seconds. */
export const PLACE_NAME = {
  fade: 0.6,
  hold: 3,
};

/** When the story's lines come (doc 12, "Story steps"; doc 13, "Narration"). Seconds, and BL. */
export const STORY = {
  /** After the shrimp is full, the Sense hint and its prompt. */
  senseHint: 5,
  /** After the first greeting, once the bird has gone, the molt signal. */
  moltAfterGreet: 60,
  /** After the molt hardens, the taste of salt. */
  saltAfterHard: 10,
  /** The first calm must last this long to be named. */
  calmFor: 10,
  /** Into the first wary time, its line. */
  waryLine: 8,
  /** The first shrimp this close is met. BL. */
  meet: 4,
  /** Into the wait for the molt, out in the open, the body asks for cover. */
  notHere: 20,
};

/** Saving at rest (doc 02, "Saving"). Seconds. */
export const SAVE = {
  /** Still under cover this long is a rest, and the life is kept. */
  rest: 3,
  /** At least this long between two saves at rest. */
  gap: 30,
};

/** The small line at the top right (doc 12, "What shows over play"). Seconds. */
export const SMALL_LINE = {
  hold: 4,
  fade: 0.4,
};

/** Molting (doc 10, "Molting"). Seconds unless said. */
export const MOLT = {
  shelter: 2,
  molt: 6,
  soft: 30,
  hardened: 3,
  scratch: 0.6,
  scratchGap: [3, 5] as [number, number],
  softSpeed: 0.5,
  /** The body grows by this share at each molt. */
  growth: 0.12,
  /** Hunger added as the new shell hardens. */
  hunger: 0.2,
  /** The view eases out to this share of the zoom by each molt: 1.40, 1.30, 1.20, 1.10 (doc 10). */
  viewByMolts: [1.4, 1.3, 1.2, 1.1],
  /** How far the body backs out of the old shell, in BL. */
  backOut: 0.9,
  /** Seconds the empty shell takes to drift off, and how far it goes, in BL. */
  shellDrift: 60,
  shellAway: 3,
  /** How see-through the empty shell is. */
  shellAlpha: 0.35,
  /** How see-through the soft body is. */
  softAlpha: 0.85,
};

/** The Drift, chapter 0 (doc 11, "Chapter 0. Drift"; doc 10, "The larva"). Pixels and seconds. */
export const DRIFT = {
  motion: {
    /** About 75 px per second: the crossing takes about two minutes. */
    flow: 75,
    steer: 110,
    lean: 45,
    response: 0.35,
    /** Jerks for the first shape, small pulses for the second, a steady swim for the last. */
    beat: {
      early: { rate: 2.2, depth: 0.8 },
      mid: { rate: 3, depth: 0.5 },
      late: { rate: 3.5, depth: 0.15 },
    },
    margin: 90,
    tilt: 0.5,
  },
  /** Seconds the larva lives on its yolk: it cannot eat and hunger waits (FAO). */
  yolk: 10,
  /** The larva's length in each shape (doc 11). */
  length: { early: 44, mid: 56, late: 70 },
  /** Seconds one shape takes to become the next. */
  change: 1.2,
  /** How far along the Drift the larva takes its last shape: early in the shafts. */
  lateAt: 5300,
  motes: {
    cloud: [6, 12] as [number, number],
    spread: 110,
    size: [14, 36] as [number, number],
    drift: 0.35,
    wobble: 18,
  },
  /** BL: motes brighten within this of the larva. */
  brighten: 1.5,
  /** BL: how far the mouth reaches beyond a mote's edge. */
  reach: 0.15,
  larvae: {
    count: 12,
    settlers: 3,
    pace: [0.85, 1.15] as [number, number],
    /** BL a settler keeps from the player, from and to. */
    keep: [2.5, 6] as [number, number],
    steer: 40,
    /** BL two larvae keep apart. */
    apart: 1.2,
    reachHaze: 1 / 3,
    /** Their length, as a share of the player's: 40 to 70 px at the middle shape. */
    size: [0.8, 1.2] as [number, number],
    /** BL: touching another larva. */
    touch: 0.8,
  },
  copepod: { every: [2, 4] as [number, number], hop: 84, hopTime: 0.25, drift: 0.35 },
  bell: { breathe: 5, drift: 0.25, open: 0.12 },
  /** Specks: how many, and the share of the flow each of the three layers drifts at. */
  specks: { count: 150, layers: [0.15, 0.35, 0.55] },
  /** The view looks ahead along the flow, as a share of its width. */
  ahead: 0.16,
  /** The brown haze at its thickest. */
  haze: 0.55,
  /** Landfall: seconds to settle, how much nearer the view sinks, seconds of the fade. */
  landfall: { settle: 3, sink: 1.15, fade: 1.5 },
};

/**
 * Sound (doc 05, "Levels", and doc 10, "Sound"). Gains are 1 as recorded,
 * filters in Hz, times in seconds to reach most of a change.
 */
export const SOUND = {
  mix: {
    ease: 0.5,
    fear: 1.5,
    relief: 4,
    layers: 1.5,
    muffle: 0.6,
    back: 3,
    area: { normal: 1, content: 1.12, hungry: 0.8, afraid: 0.25 },
    bright: { normal: 9000, content: 16000, afraid: 500 },
    uneasy: { afraid: 0.8, wary: 0.15 },
    chime: 0.5,
    shimmer: 0.4,
    open: 20000,
    hidden: 900,
    soft: { level: 0.5, bright: 1500 },
    frozenAmbience: 1.4,
  },
  /**
   * Each bus before its slider. Music sits about 6 dB under the effects and
   * the ambience under the music. The last gain keeps every peak below -6 dBFS.
   */
  bus: { music: 0.5, ambience: 0.35, effects: 1, ceiling: 0.5 },
  /** Seconds a new area's music and ambience take to cross over. */
  crossfade: 2.5,
  /** Seconds a lasting sound of the shrimp's own takes to come and go. */
  loopEase: 0.15,
  caption: { least: 2, fade: 0.3 },
};
