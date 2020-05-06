"use strict";

module.exports = {injectMenuItem};

// Purge context-menus of commands I rarely/never use
for(const {items, selector} of atom.contextMenu.itemSets)
	for(let i = items.length - 1; i >= 0; --i){
		const {command} = items[i];
		if(/.tree-view/.test(selector) && "split-diff:enable" === command
		|| /^tree-view:(duplicate|open-selected-entry-\w+)$/.test(command)
		|| /^pane:split-\w+-and-copy-active-item$/.test(command))
			items.splice(i, 1);
	}

// Strip “Window” menu of stuff that's doable in other ways
atom.menu.template[7].submenu.splice(0, 4);

// Remove that pointless “Install Shell Commands” entry
const [{submenu: atomMenu}] = atom.menu.template;
const index = atomMenu.findIndex(({command}) =>
	"window:install-shell-commands" === command);
atomMenu.splice(index - 1, 2);
atom.menu.update();


injectMenuItem({
	command: "application:open-in-new-window",
	label:   "Open In New Window…",
	menu:    ["File"],
	after:   "Open…",
});

injectMenuItem({
	command: "user:open-syntax-stylesheet",
	label:   "Syntax Stylesheet…",
	menu:    ["Atom"],
	after:   "Stylesheet…",
});


/**
 * Insert a new entry into the app's main menu-bar.
 *
 * @param {Object}   args
 * @param {String}   args.after
 * @param {String}   args.before
 * @param {String}   args.command
 * @param {String}   args.label
 * @param {String[]} args.menu
 * @return {void}
 */
function injectMenuItem({command, label, menu, after, before} = {}){
	const {template} = atom.menu;
	const menuPath = "string" === typeof menu ? [menu] : [...menu];
	menu = template;
	while(menuPath.length > 0){
		const name = menuPath.shift().toLowerCase();
		menu = menu.find(entry => {
			const label = String(entry.label).toLowerCase();
			return Array.isArray(entry.submenu) && name === label;
		}).submenu;
	}
	const ref = after || before;
	if(ref){
		const index = menu.findIndex(entry =>
			entry.label === ref || entry.command === ref);
		menu.splice(index + !!after, 0, {label, command});
	}
	else menu.push({label, command});
	atom.menu.template = template;
	atom.menu.update();
}
