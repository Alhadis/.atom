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


# Hide scope-related notices shortly after displaying them
if (delay = atom.config.get("popupDismissDelay"))? and delay isnt false
	atom.workspace.notificationManager.onDidAddNotification (popup) ->
		if /^\s*Scopes at Cursor/.test(popup.message)
			setTimeout (->
				popup.dismiss()
			), atom.config.get("popupDismissDelay") || 1000


# Crude debugging method to see what events we can hook into
prot = atom.emitter.constructor.prototype
emit = prot.emit
global.traceEmissions = (active) ->
	if active
		prot.emit = (name) ->
			console.trace arguments unless name is "did-update-state"
			emit.apply @, arguments
	else
		prot.emit = emit


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


# HACK: Register command to toggle faded tokens
atom.commands.add "atom-workspace", "user:toggle-faded-tokens", ->
	el = getRootEditorElement()
	el?.classList.toggle "show-faded-tokens"
	


# Retrieve the contents of the current editor
Object.defineProperty global, "text",
	get: -> atom.workspace.getActiveTextEditor().buffer.getText()



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
