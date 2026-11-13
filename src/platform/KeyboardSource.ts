import type { ActionState } from '../core/input/ActionState';
import type { Bindings } from '../core/input/bindings';
import { menuKeyFor, type MenuKey } from '../core/input/menuKeys';

type MenuHandler = (key: MenuKey) => void;
type CaptureHandler = (code: string) => void;

export interface KeyboardSourceOptions {
  /** The bindings in use right now. */
  bindings: () => Bindings;
  /** Called with the letter a key printed, so labels can match the player's keyboard. */
  onLetter?: (code: string, letter: string) => void;
}

/**
 * Listens to the browser's keyboard and feeds the game. It is the only place
 * that sees key events. Keys are read by position (`event.code`).
 */
export class KeyboardSource {
  private readonly menuHandlers = new Set<MenuHandler>();
  private readonly blurHandlers = new Set<() => void>();
  private captureHandler: CaptureHandler | null = null;
  private attached = false;

  constructor(
    private readonly state: ActionState,
    private readonly options: KeyboardSourceOptions,
  ) {}

  attach(): void {
    if (this.attached) return;
    this.attached = true;
    window.addEventListener('keydown', this.handleKeyDown);
    window.addEventListener('keyup', this.handleKeyUp);
    window.addEventListener('blur', this.handleBlur);
    document.addEventListener('visibilitychange', this.handleVisibility);
  }

  detach(): void {
    if (!this.attached) return;
    this.attached = false;
    window.removeEventListener('keydown', this.handleKeyDown);
    window.removeEventListener('keyup', this.handleKeyUp);
    window.removeEventListener('blur', this.handleBlur);
    document.removeEventListener('visibilitychange', this.handleVisibility);
  }

  /** Hear menu keys. Returns a function that stops listening. */
  onMenuKey(handler: MenuHandler): () => void {
    this.menuHandlers.add(handler);
    return () => this.menuHandlers.delete(handler);
  }

  /** Hear when the page loses focus. Returns a function that stops listening. */
  onBlur(handler: () => void): () => void {
    this.blurHandlers.add(handler);
    return () => this.blurHandlers.delete(handler);
  }

  /**
   * Take the next key press, whatever it is, instead of treating it as a menu
   * key or an action. Used by the rebinding screen. Returns a function that
   * gives up waiting.
   */
  captureNext(handler: CaptureHandler): () => void {
    this.captureHandler = handler;
    return () => {
      if (this.captureHandler === handler) this.captureHandler = null;
    };
  }

  private readonly handleKeyDown = (event: KeyboardEvent): void => {
    // Combinations with these belong to the browser.
    if (event.ctrlKey || event.metaKey || event.altKey) return;
    const code = event.code;
    if (!code) return;

    if (!event.shiftKey && event.key.length === 1 && event.key.trim() !== '') {
      this.options.onLetter?.(code, event.key);
    }

    if (this.captureHandler) {
      event.preventDefault();
      if (event.repeat) return;
      const handler = this.captureHandler;
      this.captureHandler = null;
      handler(code);
      return;
    }

    const menuKey = menuKeyFor(code, this.options.bindings());
    const bound = this.state.isBound(code);
    // While the game is open, its keys do not scroll or tab the page.
    if (bound || menuKey) event.preventDefault();
    if (bound) this.state.keyDown(code);

    if (!menuKey) return;
    const moves =
      menuKey === 'up' || menuKey === 'down' || menuKey === 'left' || menuKey === 'right';
    if (event.repeat && !moves) return;
    for (const handler of [...this.menuHandlers]) handler(menuKey);
  };

  private readonly handleKeyUp = (event: KeyboardEvent): void => {
    if (event.code) this.state.keyUp(event.code);
  };

  private readonly handleBlur = (): void => {
    this.state.releaseAll();
    for (const handler of [...this.blurHandlers]) handler();
  };

  private readonly handleVisibility = (): void => {
    if (document.hidden) this.handleBlur();
  };
}
