# I love this program.
#
# Atom will evaluate this file each time a new window is opened. It is run
# after packages are loaded/activated and after the previous editor state
# has been restored.
#
# An example hack to log to the console when each text editor is saved.
#
# atom.workspace.observeTextEditors (editor) ->
#   editor.onDidSave ->
#     console.log "Saved! #{editor.getPath()}"


# Crude debugging method to see what events we can hook into
prot = atom.emitter.constructor.prototype
emit = prot.emit
global.traceEmissions = (active) ->
	if active
		prot.emit = (name) ->
			unless name is "did-update-state"
				emissions.push Array.from arguments
				console.trace arguments
			emit.apply @, arguments
	else
		prot.emit = emit
	undefined

global.emissions = Object.defineProperty [], "log",
	get: -> this.map((e) -> e[0]).join("\n")


# Disable that useless pending item feature
atom.workspace.onDidAddPaneItem ({pane}) -> pane.setPendingItem(null)


# Create a global reference to the File-Icons package
global.fi = atom.packages.loadedPackages["file-icons"]?.mainModule

# Lazy alias for atom.grammars.grammarOverridesByPath
Object.defineProperty global, "overrides",
	get: -> atom.grammars.grammarOverridesByPath


# Debugging commands for developing the aforementioned package
makeSetting = (name, config) ->
	atom.commands.add "body", "file-icons:toggle-#{name}", ->
		atom.config.set config, !(atom.config.get config)

makeSetting(key, value) for key, value of {
	"changed-only": "file-icons.onChanges"
	"tab-icons":    "file-icons.tabPaneIcon"
}

atom.commands.add "body", "file-icons:open-settings", ->
	atom.workspace.open("atom://config/packages/file-icons")


# Undo whitespace molestation applied by Project-Manager
{exec} = require "child_process"
exec "cd #{__dirname}/.. && make could-you-not"


# Command to run GNU Make from project directory
atom.commands.add "atom-workspace", "user:make", ->
	projectPath = atom.project.getPaths()?[0]
	exec "cd '#{projectPath}' && make"


# Clear .DS_Store junk from desktop when saving files
atom.workspace.observeTextEditors (editor) ->
	editor.onDidSave -> setTimeout (-> exec "~/.files/bin/dsclean ~/Desktop"), 50


# Return a reference to the active text-editor's root element in the Shadow DOM
getRootEditorElement = ->
	ed = atom.workspace.getActiveTextEditor()
	ed.getElement()?.shadowRoot.querySelector(".scroll-view")

# Register command to toggle bracket-matcher
atom.commands.add "body", "user:toggle-bracket-matcher", ->
	el = getRootEditorElement()
	el?.classList.toggle "show-bracket-matcher"


# Command to reset editor's size to my preferred default, not Atom's
atom.commands.add "atom-workspace", "user:reset-font-size", ->
	atom.config.set "editor.fontSize", 11


# HACK: Register command to toggle faded tokens
atom.commands.add "atom-workspace", "user:toggle-faded-tokens", ->
	el = getRootEditorElement()
	el?.classList.toggle "show-faded-tokens"
	


# Retrieve the contents of the current editor
Object.defineProperty global, "text",
	get: -> atom.workspace.getActiveTextEditor().buffer.getText()
	set: -> atom.workspace.getActiveTextEditor().buffer.setText arguments[0]


# Access the currently active editor
Object.defineProperty global, "ed",
	get: -> atom.workspace.getActiveTextEditor()


# "Trendy Faggot" mode
trendy = atom.config.get("core.themes").includes "seti-ui"
Object.defineProperty global, "trendy",
	get: -> trendy
	set: (i) ->
		return if i is trendy
		atom.themes.onDidChangeActiveThemes => atom.reload()
		
		if trendy = i
			atom.packages.enablePackage "autocomplete-plus"
			atom.config.set "minimap.autoToggle", true
			atom.config.set "core.themes", ["seti-ui", "seti-syntax"]
			atom.config.set "file-icons.coloured", true
		else
			atom.packages.disablePackage "autocomplete-plus"
			atom.config.set "minimap.autoToggle", false
			atom.config.set "core.themes", ["atom-light-ui", "Phoenix-Syntax"]
			atom.config.set "file-icons.coloured", false


global.__fileIconsDebugFilter = /Adding grammar/
global.fip = atom.packages.loadedPackages["file-icons"].path + "/"
global.icons = require(fip + "lib/service/icon-service")


global.print = require "print"
