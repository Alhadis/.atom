/**
 * @fileoverview "Yeah/Nah" mode for sorting through harvested search results manually.
 * @see {@link https://github.com/Alhadis/Harvester}
 * @see {@link https://github.com/Alhadis/Silos}
 */
"use strict";

const isDir = path => existsSync(path) && lstatSync(path).isDirectory();
const {existsSync, lstatSync, readdirSync, renameSync} = require("fs");
const {CompositeDisposable} = require("atom");
const {join} = require("path");
const {classList} = document.body;

let disposable = null;
let ynMode = false;
let files  = null;

Object.defineProperty(global, "ynMode", {
	configurable: true,
	enumerable:   true,
	get: () => ynMode,
	set: to => (ynMode === (to = !!to)) || ((ynMode = to) ? enable() : disable()),
});

function enable(){
	disposable && disposable.dispose();
	disposable = new CompositeDisposable();
	atom.config.set("user.enable-pending-items", true);
	classList.add("yn-mode");
	disposable.add(atom.commands.add("atom-workspace", {
		"yn-mode:yeah": event => sort(true, event),
		"yn-mode:nah":  event => sort(false, event),
	}));
}

function disable(){
	disposable.dispose();
	disposable = files = null;
	atom.config.set("user.enable-pending-items", false);
	classList.remove("yn-mode");
}

function sort(bool, event){
	let dir, editor;
	
	if((editor = atom.workspace.getActiveTextEditor())
	&& (dir = editor.getDirectoryPath())
	&& isDir(join(dir, "yeah"))
	&& isDir(join(dir, "nah"))){
		const path = editor.getPath();
		const dest = join(dir, bool ? "yeah" : "nah", editor.getFileName());
		
		// This shouldn't happen, but better safe than sorry
		if(existsSync(dest)){
			event.abortKeyBinding();
			const note = atom.notifications.addError("File already exists:", {
				description: `~~~\n${dest}\n~~~`,
				dismissable: true,
			});
			setTimeout(() => note && note.dismiss(), 3000);
			return;
		}
		
		files = files || readdirSync(dir)
			.filter(x => !["yeah", "nah"].includes(x))
			.map(x => join(dir, x))
			.sort((a, b) => a.toLowerCase().localeCompare(b.toLowerCase()));
		
		const next = files.indexOf(path) + 1;
		const pane = atom.workspace.getActivePane();
		const item = atom.workspace.getActivePaneItem();
		
		// Shouldn't happen, either
		if(null === pane || null === item || 0 === next) return;
		
		event.abortKeyBinding();
		item.destroy();
		renameSync(path, dest);
		atom.workspace.open(files[next], {pending: true});
	}
}
