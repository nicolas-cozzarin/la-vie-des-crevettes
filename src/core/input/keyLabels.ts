/**
 * What to print for a key. Bindings are stored by physical position, but the
 * player should see the letter printed on their own keyboard.
 */
export interface KeyLabelSources {
  /** Names for keys that have no letter, such as Space. Already translated. */
  named?: Readonly<Record<string, string>>;
  /** From the browser's keyboard layout map, where it exists. */
  layout?: ReadonlyMap<string, string> | null;
  /** Letters seen when the player pressed keys during this or an earlier visit. */
  observed?: ReadonlyMap<string, string> | Readonly<Record<string, string>> | null;
}

const ARROWS: Readonly<Record<string, string>> = {
  ArrowUp: '↑',
  ArrowDown: '↓',
  ArrowLeft: '←',
  ArrowRight: '→',
};

const US_PUNCTUATION: Readonly<Record<string, string>> = {
  Comma: ',',
  Period: '.',
  Slash: '/',
  Semicolon: ';',
  Quote: "'",
  BracketLeft: '[',
  BracketRight: ']',
  Backslash: '\\',
  Minus: '-',
  Equal: '=',
  Backquote: '`',
  IntlBackslash: '\\',
};

function lookup(
  source: KeyLabelSources['observed'] | KeyLabelSources['layout'],
  code: string,
): string | undefined {
  if (!source) return undefined;
  if (source instanceof Map) return source.get(code);
  return (source as Readonly<Record<string, string>>)[code];
}

/** The US label for a key position. The last resort. */
export function usLabel(code: string): string {
  if (/^Key[A-Z]$/.test(code)) return code.slice(3);
  if (/^Digit\d$/.test(code)) return code.slice(5);
  if (/^Numpad\d$/.test(code)) return `Num ${code.slice(6)}`;
  return US_PUNCTUATION[code] ?? code;
}

export function keyLabel(code: string | null, sources: KeyLabelSources = {}): string {
  if (code === null) return '';
  const arrow = ARROWS[code];
  if (arrow) return arrow;
  const named = sources.named?.[code];
  if (named) return named;
  const letter = lookup(sources.layout, code) ?? lookup(sources.observed, code);
  if (letter && letter.trim() !== '') return letter.toUpperCase();
  return usLabel(code);
}
