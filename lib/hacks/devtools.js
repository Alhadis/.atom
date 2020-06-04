"use strict";

module.exports = {
	isDevToolsOpened,
	resyncDevToolsConfig,
};

Object.assign(global, {resyncDevToolsConfig});
isDevToolsOpened() && resyncDevToolsConfig();


/**
 * Determine if the DevTools pane is currently open.
 * @return {Boolean}
 */
function isDevToolsOpened(){
	const {remote} = require("electron");
	return remote.getCurrentWindow().isDevToolsOpened();
}

/**
 * Refresh/update personalised devtools settings.
 * @return {Promise<*>}
 */
async function resyncDevToolsConfig(){
	const {remote} = require("electron");
	const window   = remote.getCurrentWindow();
	const devTools = window.devToolsWebContents;
	if(!devTools) return false;
	
	return devTools.executeJavaScript(`(${() => {
		const settings = Common.settings._registry;
		for(const [key, value] of Object.entries({
			consoleEagerEval: false,
			textEditorAutocompletion: false,
			consoleHistoryAutocomplete: false,
			consoleShowSettingsToolbar: false,
			"console.textFilter": [
				/\bReact DevTools\b/i,
				/^\[Intervention\] /,
				"-url:<embedded>",
				"-url:/Applications/Atom.app/Contents/Resources/app.asar/src/workspace-element.js",
			].map(x => x.toString()).join(" "),
			messageLevelFilters: {
				verbose: false,
				info:    true,
				warning: true,
				error:   true,
			},
			monitoringXHREnabled: true,
			textEditorIndent: "\t",
		})) settings.get(key).set(value);
		
		// Hide the number of hidden messages; I don't care
		const filterCount = Console.ConsoleView.instance()._filterStatusText.element;
		filterCount.style.display = "none !important";
	}})()`);
}
