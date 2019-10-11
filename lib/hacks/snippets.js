"use strict";

const fs = require("fs");
const os = require("os");
const {exec, which} = require("alhadis.utils");
const snippetsPath = `${os.homedir}/.emacs.d/snippets`;

if(fs.existsSync(snippetsPath) && fs.statSync(snippetsPath).isDirectory()){
	atom.workspace.observeTextEditors(editor => {
		const {scopeName, id} = editor.getGrammar() || {};
		if("source.yasnippet" === scopeName || "source.yasnippet" === id)
			editor.onDidSave(async () => {
				const atomPath = atom.getConfigDirPath();
				const result = await exec("make", ["snippets"], null, {cwd: atomPath});
				result.code
					? console.error(result)
					: console.log("Snippets recompiled");
			});
	});
}
