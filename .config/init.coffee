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
		prot.emit = () ->
			console.trace arguments
			emit.apply @, arguments
	else
		prot.emit = emit


# Crude hack until atom/atom#11483 is fixed
atom.commands.add "body", "user:saved-bookmark", (event) ->
	line = atom.config.get("saved-bookmark-line")
	if line
		editor = atom.workspace.getActiveTextEditor()
		editor.setCursorBufferPosition [line, 0], autoscroll: true
		editor.scrollToBufferPosition [line, 0], center: true
