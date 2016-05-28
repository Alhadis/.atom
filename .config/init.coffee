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


# Register command to toggle bracket-matcher
atom.commands.add "body", "user:toggle-bracket-matcher", ->
	ed = atom.workspace.getActiveTextEditor()
	el = ed.getElement()?.shadowRoot.querySelector(".scroll-view")
	el?.classList.toggle("show-bracket-matcher")
