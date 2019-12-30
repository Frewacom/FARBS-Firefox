/*
On startup, connect to the "ping_pong" app.
*/
var port = browser.runtime.connectNative("pywalfox");

function createTheme(colors) {
    const theme = {
        colors: {
            icons: colors.foreground,
            icons_attention: colors.accent_secondary_light,
            frame: colors.background,
            tab_text: colors.background,
            tab_loading: colors.accent_primary_light,
            tab_background_text: '#fff',
            tab_selected: colors.foreground,
            tab_line: colors.foreground,
            tab_background_separator: colors.background,
            toolbar: colors.background,
            toolbar_field: colors.background,
            toolbar_field_focus: colors.background,
            toolbar_field_text: '#fff',
            toolbar_field_text_focus: '#fff',
            toolbar_field_border: colors.background,
            toolbar_field_border_focus: colors.background,
            toolbar_field_separator: colors.background,
            toolbar_field_highlight: colors.accent_secondary_light,
            toolbar_field_highlight_text: '#fff',
            toolbar_bottom_separator: colors.background,
            toolbar_top_separator: colors.background,
            toolbar_vertical_separator: colors.background_light,
            ntp_background: colors.background,
            ntp_text: colors.foreground,
            popup: colors.background,
            popup_border: colors.background,
            popup_text: colors.foreground,
            popup_highlight: colors.accent_secondary,
            popup_highlight_text: '#fff',
            sidebar: colors.background,
            sidebar_border: colors.background,
            sidebar_text: colors.foreground,
            sidebar_highlight: colors.accent_primary_light,
            sidebar_highlight_text: '#fff',
            bookmark_text: '#fff',
            button_background_hover: colors.background_light,
            button_background_active: colors.background_light,
        }
    };

    return theme;
}

function output(message) {
    browser.runtime.sendMessage({ action: 'output', message });
}

/*
Listen for messages from the app.
*/
port.onMessage.addListener((response) => {
    if (response.key == 'colorscheme') {
        if (response.success) {
            const theme = createTheme(response.data);
            browser.theme.update(theme);
            output('Fetched and applied colorscheme successfully.')
        } else {
            output(response.error);
        }
    } else if (response.key == 'customCss') {
        if (response.success) {
            output(response.data);
        } else {
            output(response.error);
        }
    }
});

browser.runtime.onMessage.addListener((message) => {
    if (message.action == 'update') {
        port.postMessage('update');
    } else if (message.action == 'reset') {
        browser.theme.reset();
    } else if (message.action == 'enableCustomCss') {
        port.postMessage('enableCustomCss');
    } else if (message.action == 'disableCustomCss') {
        port.postMessage('disableCustomCss');
    }
});