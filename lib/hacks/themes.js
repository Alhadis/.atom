"use strict";

const {$} = require("../utils/other.js");
const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");
let darkMode = null;
let [darkTheme, lightTheme] = atom.themes.getActiveThemeNames();

Object.defineProperties(window, {
	/**
	 * System's current "dark mode" setting, or its most recent override.
	 * @property {Boolean} darkMode
	 */
	darkMode: {
		get(){
			return darkMode ?? (darkMode = mediaQuery.matches);
		},
		
		set(to){
			if(darkMode = !!to){
				atom.config.set("file-icons.coloured", true);
				atom.config.set("core.themes", ["seti-ui", this.darkTheme]);
			}
			else{
				atom.config.set("file-icons.coloured", false);
				atom.config.set("core.themes", ["atom-light-ui", this.lightTheme]);
			}
		},
	},
	
	/**
	 * Dark-coloured syntax theme used when dark-mode is active.
	 * @property {String} [darkTheme="seti-syntax"]
	 */
	darkTheme: {
		get(){
			return darkTheme || "seti-syntax";
		},
		set(to){
			if((to = String(to || "").toLowerCase()) === darkTheme) return;
			if(!atom.themes.getLoadedThemeNames().includes(to))
				throw new TypeError(`Unrecognised syntax theme: "${to}"`);
			darkTheme = to;
			if(this.darkMode){
				const themes = atom.config.get("core.themes");
				themes[1] = darkTheme;
				atom.config.set("core.themes", themes);
			}
		},
	},
	
	/**
	 * Light-coloured syntax theme used when dark-mode *isn't* active.
	 * @property {String} [lightTheme="biro-syntax"]
	 */
	lightTheme: {
		get(){
			return lightTheme || "biro-syntax";
		},
		set(to){
			if((to = String(to || "").toLowerCase()) === lightTheme) return;
			if(!atom.themes.getLoadedThemeNames().includes(to))
				throw new TypeError(`Unrecognised syntax theme: "${to}"`);
			lightTheme = to;
			if(!this.darkMode){
				const themes = atom.config.get("core.themes");
				themes[1] = lightTheme;
				atom.config.set("core.themes", themes);
			}
		},
	},
});

mediaQuery.addListener(event => window.darkMode = event.matches);

atom.commands.add("atom-workspace", {
	"dark-mode:disable": () => $ `dark-mode false`,
	"dark-mode:enable":  () => $ `dark-mode true`,
	"dark-mode:toggle":  () => $ `dark-mode -t`,
	"user:toggle-github-syntax": () => {
		const githubTheme = "atom-github-syntax";
		if(!atom.themes.getActiveThemeNames().includes(githubTheme))
			window.lightTheme = window.darkTheme = githubTheme;
		else{
			window.lightTheme = "biro-syntax";
			window.darkTheme  = "seti-syntax";
		}
	},
});
