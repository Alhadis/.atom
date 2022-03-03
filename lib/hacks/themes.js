"use strict";

const {$} = require("../utils/other.js");
const mediaQuery   = window.matchMedia("(prefers-color-scheme: dark)");
let githubMode     = null;
let darkMode       = null;

// Most commonly-used syntax themes
const GITHUB_THEME = "atom-github-syntax";
const LIGHT_THEME  = "biro-syntax";
const DARK_THEME   = "seti-syntax";

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
			const themes = atom.config.get("core.themes");
			const githubMode = themes.includes(GITHUB_THEME);
			if(darkMode = !!to){
				atom.config.set("file-icons.coloured", true);
				atom.config.set("core.themes", ["seti-ui", githubMode ? GITHUB_THEME : DARK_THEME]);
			}
			else{
				atom.config.set("file-icons.coloured", false);
				atom.config.set("core.themes", ["atom-light-ui", LIGHT_THEME]);
			}
		},
	},
	
	/**
	 * Does the current syntax theme emulate GitHub's look-and-feel?
	 * @property {Boolean} githubMode
	 */
	githubMode: {
		get(){
			if(null == githubMode)
				githubMode = atom.config.get("core.themes").includes(GITHUB_THEME);
			return githubMode;
		},
		set(to){
			const themes = atom.config.get("core.themes");
			if(githubMode !== (to = !!to)){
				githubMode = to;
				const theme = to ? GITHUB_THEME : this.darkMode ? DARK_THEME : LIGHT_THEME;
				themes.splice(themes.indexOf(GITHUB_THEME), 1, theme);
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
	"user:toggle-github-syntax": () => window.githubMode = !window.githubMode,
});
