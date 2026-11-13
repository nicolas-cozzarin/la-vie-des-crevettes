import type { Action } from './core/input/actions';
import { ActionState } from './core/input/ActionState';
import { keyLabel } from './core/input/keyLabels';
import { loadSettings, saveSettings, type SettingsV1 } from './core/save/settings';
import type { KeyValueStore } from './core/save/store';
import { i18n, t } from './i18n';
import { openBrowserStore } from './platform/browserStore';
import { readLayoutMap } from './platform/keyboardLayout';
import { KeyboardSource } from './platform/KeyboardSource';

/**
 * The parts of the game that outlive any one scene: settings, storage and the
 * keyboard. Scenes reach them through the `app` export.
 */
class App {
  readonly store: KeyValueStore;
  /** False when the browser will not keep settings after the page closes. */
  readonly persistent: boolean;
  /** Actions for the game to read. Never read keys. */
  readonly actions: ActionState;
  readonly keyboard: KeyboardSource;

  private current: SettingsV1;
  private layout: ReadonlyMap<string, string> | null = null;

  constructor() {
    const opened = openBrowserStore();
    this.store = opened.store;
    this.persistent = opened.persistent;

    this.current = loadSettings(this.store, {
      lang: i18n.lang,
      reducedMotion: window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false,
    });
    i18n.setLang(this.current.lang);

    this.actions = new ActionState(this.current.bindings);
    this.actions.setMode('sense', this.current.senseMode);
    this.actions.setMode('hide', this.current.hideMode);

    this.keyboard = new KeyboardSource(this.actions, {
      bindings: () => this.current.bindings,
      onLetter: (code, letter) => this.rememberLetter(code, letter),
    });
    this.keyboard.attach();

    void readLayoutMap().then((layout) => {
      this.layout = layout;
    });
  }

  get settings(): Readonly<SettingsV1> {
    return this.current;
  }

  /** Change settings, apply them and store them. Returns false if storing failed. */
  update(patch: Partial<SettingsV1>): boolean {
    this.current = { ...this.current, ...patch };
    if (patch.bindings) this.actions.setBindings(patch.bindings);
    if (patch.senseMode) this.actions.setMode('sense', patch.senseMode);
    if (patch.hideMode) this.actions.setMode('hide', patch.hideMode);
    if (patch.lang) {
      i18n.setLang(patch.lang);
      document.documentElement.lang = patch.lang;
    }
    return saveSettings(this.store, this.current);
  }

  /** What to print for a key, as it reads on the player's own keyboard. */
  keyName(code: string | null): string {
    if (code === null) return '';
    const numpad = /^Numpad(\d)$/.exec(code);
    if (numpad) return t('key.numpad', { n: numpad[1] ?? '' });
    const nameKey = `key.${code}`;
    return keyLabel(code, {
      named: i18n.has(nameKey) ? { [code]: t(nameKey) } : undefined,
      layout: this.layout,
      observed: this.current.keyLabels,
    });
  }

  /** The key to show in a prompt for an action: its first slot that has one. */
  actionKey(action: Action): string {
    const [first, second] = this.current.bindings[action];
    return this.keyName(first ?? second);
  }

  private rememberLetter(code: string, letter: string): void {
    if (this.current.keyLabels[code] === letter) return;
    this.current = {
      ...this.current,
      keyLabels: { ...this.current.keyLabels, [code]: letter },
    };
    saveSettings(this.store, this.current);
  }
}

export const app = new App();
