"use strict";

const fs = require("fs");
const os = require("os");
const {exec, which} = require("alhadis.utils");
const snippetsPath = fs.realpathSync(`${os.homedir}/.emacs.d/snippets`);

if(fs.existsSync(snippetsPath) && fs.lstatSync(snippetsPath).isDirectory()){
	atom.workspace.observeTextEditors(editor => {
		const {scopeName, id} = editor.getGrammar() || {};
		if("source.yasnippet" === scopeName || "source.yasnippet" === id)
			editor.onDidSave(async () => {
				const result = await exec("make", ["-C", "~/.atom", "snippets"]);
				result.code
					? console.error(result)
					: console.log("Snippets recompiled");
			});
	});
}
