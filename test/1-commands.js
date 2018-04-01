"use strict";

let workspace = null;
let editor    = null;

const {setTheme, wait} = require("../src/utils/other.js");
const getWS   = () => workspace = atom.views.getView(atom.workspace);

const themes = [
	"atom-light-ui",
	"biro-syntax",
];
const pkgList = [
	"status-bar",
	"tree-view",
	"tabs",
	"bracket-matcher",
	"language-javascript",
	...themes,
];

describe("Commands", () => {
	before(() => {
		atom.project.setPaths([__dirname + "/fixtures"]);
		return Promise.all([
			...pkgList.map(pkg => atom.packages.activatePackage(pkg)),
			atom.workspace.open("file.js"),
			setTheme("atom-light-ui", "biro-syntax"),
		]).then(([...values]) => {
			editor = atom.workspace.getActiveTextEditor();
			editor.shouldPromptToSave = () => false;
			editor.setText("");
			editor.save();
			require(__dirname + "/../src/index.js");
		}).then(() => attachToDOM(getWS()));
	});
	
	describe("Display-related commands", () => {
		when("`user:toggle-bracket-matcher` is called", () => {
			
			it("highlights matching brackets under the cursor", () => {
				const highlights = workspace.getElementsByClassName("bracket-matcher");
				editor.setText("AA (123) ZZ");
				highlights.should.be.empty;
				editor.setCursorBufferPosition([0, 3]);
			});
		});
		
	});
});
