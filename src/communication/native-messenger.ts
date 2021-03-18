import {
  ThemeModes,
  NativeAppErrors,
  INativeAppError,
  INativeAppMessage,
  INativeAppRequest,
  INativeAppMessageCallbacks,
} from '@definitions';

import { RESPONSE_TIMEOUT_MS, NATIVE_MESSAGES } from '@config/general';

/**
 * Implements the communcation with the native messaging host.
 *
 * @remarks
 * Based on the native messaging protocol, allowing extensions to communicate with
 * user's computer and share resources that are otherwise inaccessible by the browser.
 * https://developer.mozilla.org/en-US/docs/Mozilla/Add-ons/WebExtensions/Native_messaging
 */
export default class NativeApp {
  public isConnected: boolean;

  private port: browser.runtime.Port;
  private callbacks: INativeAppMessageCallbacks;

  private versionCheckTimeout: number;
  private connectedCheckTimeout: number;

  constructor(callbacks: INativeAppMessageCallbacks) {
    this.callbacks = callbacks;
  }

  private log(message: string, error?: boolean) {
    this.callbacks.output(message, error);
  }

  private logError(error: string) {
    this.log(error, true);
  }

  private getData(message: INativeAppMessage) {
    if (message.hasOwnProperty('data')) {
      return message.data;
    }

    this.logError('Recieved invalid message from native app. The \'data\' field is undefined.');
    return null;
  }

  private async onMessage(message: INativeAppMessage) {
    console.debug(message);
    switch (message.action) {
      case NATIVE_MESSAGES.VERSION:
        this.onVersionResponse(message);
        break;
      case NATIVE_MESSAGES.OUTPUT:
        this.onDebuggingOutput(message);
        break;
      case NATIVE_MESSAGES.PYWAL_COLORS:
        this.onPywalColorsResponse(message);
        break;
      case NATIVE_MESSAGES.CSS_ENABLE: /* fallthrough */
      case NATIVE_MESSAGES.CSS_DISABLE:
        this.onCssToggleResponse(message);
        break;
      case NATIVE_MESSAGES.CSS_FONT_SIZE:
        this.onCssFontSizeResponse(message);
        break;
      case NATIVE_MESSAGES.THEME_MODE:
        this.onThemeModeResponse(message);
        break;
      case NATIVE_MESSAGES.INVALID_ACTION:
        this.logError(`Native app recieved unhandled message action: ${message.action}`);
        break;
      default:
        this.logError(`Received unhandled message action: ${message.action}`);
        break;
    }
  }

  private onVersionResponse(message: INativeAppMessage) {
    const version = this.getData(message);
    if (version) {
      this.callbacks.version(version);
    } else {
      this.callbacks.updateNeeded();
    }

    clearTimeout(this.versionCheckTimeout);
  }

  private onPywalColorsResponse(message: INativeAppMessage) {
    if (!message.success) {
      this.callbacks.pywalColorsFetchFailed(message.error);
      return;
    }

    const pywalData = this.getData(message);

    if (!pywalData) {
      this.logError('Pywal data was read successfully but contained null');
      return;
    }

    if (pywalData.hasOwnProperty('wallpaper')) {
      this.callbacks.pywalColorsFetchSuccess(pywalData);
    } else {
      /* Native app version >= 2.7 returns a completely different response type compared
       * to previous versions. This means that fetching will not work unless the user updates.
       * The backwards compatibility fix is simple, so I figured it is fine to leave it in here
       * if the user does not want to update for some reason.
       */
      this.callbacks.pywalColorsFetchSuccess({ colors: pywalData, wallpaper: null });
    }
  }

  private onCssToggleResponse(message: INativeAppMessage) {
    const target = this.getData(message);

    if (message.success) {
      if (!target) {
        this.logError('Custom CSS was applied successfully, but the target was not specified');
        return;
      }

      this.callbacks.cssToggleSuccess(target);
    } else {
      this.callbacks.cssToggleFailed(target, message.error);
    }
  }

  private onCssFontSizeResponse(message: INativeAppMessage) {
    if (message.success) {
      const updatedFontSize = this.getData(message);

      if (!updatedFontSize) {
        this.logError('Font size was updated successfully, but the new size was not specified');
        return;
      }

      this.callbacks.cssFontSizeSetSuccess(parseInt(updatedFontSize, 10));
    } else {
      this.callbacks.cssFontSizeSetFailed(message.error);
    }
  }

  private onThemeModeResponse(message: INativeAppMessage) {
    const mode: string = this.getData(message);

    if (!mode) {
      this.logError('Received theme mode command, but the new mode was not specified');
      return;
    }

    if (mode === ThemeModes.Dark) {
      this.callbacks.themeModeSet(ThemeModes.Dark);
    } else if (mode === ThemeModes.Light) {
      this.callbacks.themeModeSet(ThemeModes.Light);
    } else if (mode === ThemeModes.Auto) {
      this.callbacks.themeModeSet(ThemeModes.Auto);
    } else {
      this.logError(`Received theme mode command, but the mode "${mode}" was invalid`);
    }
  }

  private onDebuggingOutput(message: INativeAppMessage) {
    const output: string = this.getData(message);
    output && this.callbacks.output(output);
  }

  private async onDisconnect(port: browser.runtime.Port) {
    console.log(port);
    const { error } = port;

    clearTimeout(this.versionCheckTimeout);
    clearTimeout(this.connectedCheckTimeout);

    const nativeError: INativeAppError = {
      type: NativeAppErrors.None,
      message: null,
    };

    if (error) {
      switch (error.message) {
        case 'Error: No such native application pywalfox':
          nativeError.type = NativeAppErrors.ManifestNotInstalled;
        case "Error: An unexpected error occurred":
          // BUG: For some reason, the "File at path <path> does not exist, or is not executable"
          // error does not get set, so we will just assume that is the cause for this for now.
          nativeError.type = NativeAppErrors.UnexpectedError;
        default:
          nativeError.type = NativeAppErrors.Unknown;
      }

      nativeError.message = error.message;
    }

    this.logError(`Disconnected from native messaging host: ${error}`);

    this.callbacks.disconnected(nativeError);
  }

  private setupListeners() {
    this.port.onMessage.addListener(this.onMessage.bind(this));
    this.port.onDisconnect.addListener(this.onDisconnect.bind(this));
  }

  private sendMessage(message: INativeAppRequest) {
    if (!this.isConnected) {
      // If we are not connected, it means that an error occured. No point to try and reconnect
      this.logError('Failed to send data to native app. You are not connected');
      return;
    }

    this.port.postMessage(message);
  }

  public connect() {
    this.port = browser.runtime.connectNative('pywalfox');
    const { error } = this.port;

    if (!error) {
      this.isConnected = true;

      this.setupListeners();
      this.versionCheckTimeout = window.setTimeout(
        this.callbacks.updateNeeded,
        RESPONSE_TIMEOUT_MS,
      );

      this.requestVersion();

      this.callbacks.connected();
    } else {
      this.logError(`Failed to connect to native app: ${error.message}`);
    }
  }

  public requestVersion() {
    this.sendMessage({ action: NATIVE_MESSAGES.VERSION });
  }

  public requestPywalColors() {
    this.sendMessage({ action: NATIVE_MESSAGES.PYWAL_COLORS });
  }

  public requestCssEnabled(target: string, enabled: boolean) {
    const action = enabled ? NATIVE_MESSAGES.CSS_ENABLE : NATIVE_MESSAGES.CSS_DISABLE;
    this.sendMessage({ action, target });
  }

  public requestFontSizeSet(target: string, size: number) {
    this.sendMessage({ action: NATIVE_MESSAGES.CSS_FONT_SIZE, target, size });
  }
}
