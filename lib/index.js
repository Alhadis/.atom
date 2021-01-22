"use strict";

// Helper functions
require("./utils/other.js");
require("./utils/global.js");
require("./utils/buffer.js");
require("./utils/diagnostics.js");

// Custom commands
require("./commands/display.js");
require("./commands/editor.js");
require("./commands/other.js");
require("./commands/scopes.js");
require("./commands/text-alignment.js");
require("./commands/yn-mode.js");

// Everything else
require("./hacks/snippets.js");
require("./hacks/status-bar.js");
require("./hacks/whitespace.js");
require("./hacks/natives.js");
require("./hacks/editors.js");
require("./hacks/menus.js");
require("./hacks/other.js");
require("./hacks/devtools.js");
