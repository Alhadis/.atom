"use strict";

let trendy = atom.config.get("core.themes").includes("seti-ui");


Object.defineProperties(global, {
	
	fs:   {value: require("fs")},
	path: {value: require("path")},
	
	/** Contents of the current editor */
	text: {
		get(){  return this.ed.buffer.getText(); },
		set(i){ this.ed.buffer.setText(i); }
	},
	
	
	/** Currently active editor */
	ed: {
		get(){ return atom.workspace.getActiveTextEditor() }
	},
	
	
	/** Currently active pane */
	pane: {
		get(){ return atom.workspace.getActivePane() }
	},
	
	
	/** Tree-view element */
	treeView: {
		get(){ return atom.packages.activePackages["tree-view"].mainModule.treeView[0]; }
	},
	
	
	/** "Trendy Faggot" mode */
	trendy: {
		get(){ return trendy },
		set(i){
			if(i === trendy) return;
			atom.themes.onDidChangeActiveThemes(_=> atom.reload());
			
			if(trendy = i){
				atom.packages.enablePackage("autocomplete-plus");
				atom.config.set("minimap.autoToggle", true);
				atom.config.set("core.themes", ["seti-ui", "seti-syntax"]);
				atom.config.set("file-icons.coloured", true);
			}
			else{
				atom.packages.disablePackage("autocomplete-plus");
				atom.config.set("minimap.autoToggle", false);
				atom.config.set("core.themes", ["atom-light-ui", "Phoenix-Syntax"]);
				atom.config.set("file-icons.coloured", false);
			}
		}
	}
	
});
