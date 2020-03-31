// Default colorscheme for the extension pages
const DEFAULT_COLORSCHEME = {
    BACKGROUND: '#252525',
    FOREGROUND: '#ffffff',
    BACKGROUND_LIGHT: '#444444',
    ACCENT_PRIMARY: '#0284f7',
    ACCENT_SECONDARY: '#0284f7',
    TEXT: '#ffffff'
};

// The default theme template
const DEFAULT_THEME_TEMPLATE = {
    accentPrimary: 1,
    accentSecondary: 2,
    background: 0,
    foreground: 15,
    text: 16,
    backgroundLight: 17
};

// The keys in which custom colors will be stored
const CUSTOM_COLOR_KEYS = [
    'customBackground',
    'customForeground',
    'customBackgroundLight',
    'customAccentPrimary',
    'customAccentSecondary',
    'customText'
];

// The keys in which pywal colors will be stored
const THEME_COLOR_KEYS = [
    'background',
    'foreground',
    'backgroundLight',
    'accentPrimary',
    'accentSecondary',
    'text'
];

const PYWAL_PALETTE_LENGTH = 18;

const REQUIRED_DAEMON_VERSION = 2.0;

// The URL pattern to be used when sending messages to DuckDuckGo
const DDG_URL_PATTERN = [ "*://*.duckduckgo.com/*" ];

const EXTERNAL_ACTIONS = {
  THEME_COLORS: 'colors',
  THEME_DISABLED: 'disabled'
};

const ACTIONS = {
  VERSION: 'debug:version',
  OUTPUT: 'debug:output',
  COLORS: 'action:colors',
  INVALID_ACTION: 'action:invalid',
  CSS_ENABLE: 'css:enable',
  CSS_DISABLE: 'css:disable',
};

