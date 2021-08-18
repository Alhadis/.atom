/**
 * @file Sync UI theme choice with system's "dark mode" setting.
 */
"use strict";

const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");
let darkMode = null;

Object.defineProperty(window, "darkMode", {
	get(){
		return darkMode ?? (darkMode = mediaQuery.matches);
	},
	
	set(to){
		if(darkMode = !!to){
			atom.config.set("file-icons.coloured", true);
			atom.config.set("core.themes", ["seti-ui", "seti-syntax"]);
		}
		else{
			atom.config.set("file-icons.coloured", false);
			atom.config.set("core.themes", ["atom-light-ui", "biro-syntax"]);
		}
	},
});

mediaQuery.addListener(event => window.darkMode = event.matches);

atom.commands.add("atom-workspace", {
	"dark-mode:disable": () => window.darkMode = false,
	"dark-mode:enable":  () => window.darkMode = true,
	"dark-mode:toggle":  () => window.darkMode = !window.darkMode,
});
