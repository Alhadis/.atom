all: init.js install hooks snippets clean lint watch

install: node_modules/roff node_modules/prompt-view ascii-info hooks
	command -v asar >/dev/null || npm -g i asar
	cd packages && $(MAKE)


# Initialisation file, untracked alias for lib/index.js
init.js:
	printf >  $@ '"use strict";\n'
	printf >> $@ 'require("./lib/index.js");\n'


# Delete useless crap
clean:
	rm -f init.coffee
	rm -f npm-debug.log
	rm -f package-lock.json
	rm -f nohup.out
	rm -rf git-time-machine
	rm -rf split-diff
	(rmdir * 2>&1) >/dev/null || true
.PHONY: clean


# Steps to run after accidentally installing an update (macOS ≤ 10.14)
version = 1.46.0
sha256 = 7bfa7c099754a682fa8af8c5224fddc46253ad70bf4adbd95d9a88d68e70dcbc
downgrade: atom-v$(version).zip
	@ case `uname -s` in Darwin);; *) printf 'This task only works on macOS\n'; exit 2;; esac
	@ grep < config.cson -q 'automaticallyUpdate: *false' || {\
		printf >&2 '"core.automaticallyUpdate" must be set to `false` in `config.cson`\n'; \
		exit 2; \
	};
	@ if atom --version 2>&1 | grep -q '^Atom .*$(version)$$'; then\
		printf >&2 'Already using Atom v$(version)\n'; \
		exit 2; \
	fi
	printf '%s %s\n' "$(sha256)" "$^" | sha256sum --check -
	sudo rm -rf /Applications/Atom.app
	sudo rm -rf ~/Library/Caches/com.github.atom.ShipIt
	sudo rm -rf ~/Library/Caches/com.github.atom
	7z x $^
	mv Atom.app /Applications
	mkdir -p ~/.files/var/bin; \
	cd /Applications/Atom.app/Contents/Resources/app; \
	command -v atom 2>&1 >/dev/null || ln -sf "`pwd`/atom.sh" ~/.files/var/bin/atom; \
	command -v apm  2>&1 >/dev/null || ln -sf "`pwd`/apm/bin/apm" ~/.files/var/bin;
	$(MAKE) patch
.PHONY: downgrade

atom-v$(version).zip:
	wget 'https://github.com/atom/atom/releases/download/v$(version)/atom-mac.zip'
	mv atom-mac.zip $@



# Check source code for errors and style violations
lint: node_modules/jg
	npx jg lint -j
	

# Monitor `config.cson` for changes to keep Atom's shitty code-style out of my repository
watch:
	watchman watch $(PWD)
	watchman -- trigger $(PWD) unfuck config.cson -- ./unfuck-config
.PHONY: watch


# Brutally hack parts of Atom that aren't configurable
patch:
	@ set -o errexit; \
	case `uname -s` in \
		Linux)  cd /usr/share/atom/resources;; \
		Darwin) cd "`which atom | xargs realpath | xargs dirname`/.." ;; \
		*)  printf 'No idea where Atom is on %s. Bailing\n' "`uname -s`"; exit 2\
	;; esac; \
	echo 'Unpacking app.asar'; \
	sudo asar extract app.asar app-patch; \
	cd ./app-patch/node_modules/season/lib; \
	echo 'Patching CSON'; \
	sudo sed -i.ugh \
		-e 's|\(CSON\.stringify(object, visitor\), space|\1, "\\t"|g' \
		-e 's|\(JSON\.stringify(object, [^,]*\), [^)]*|\1, "\\t"|g' \
		cson.js && sudo rm -f cson.js.ugh && cd $$OLDPWD; \
	echo 'Patching spellchecker'; \
	cd ./app-patch/node_modules/spell-check/lib; \
	sudo sed -i.ugh \
		-e 's/^\( *noticesMode *= *\)atom\.config\.get(.spell-check\.noticesMode.)/\1""/g' \
		-e '/^\/\/# sourceMappingURL=/ d' \
		locale-checker.js && sudo rm -f *.js.ugh && cd $$OLDPWD; \
	echo 'Packing updated files'; \
	sudo mv app.asar app-unpatched.asar && \
	sudo asar pack app-patch app.asar && \
	sudo rm -f app-unpatched.asar;


# Projects folder that should already exist on my personal workstation(s)
projects = $(HOME)/Labs

$(projects):
	[ -d "$@" ] || mkdir "$@"

$(projects)/%: $(projects)
	[ -d "$@/.git" ] || git -C "$^" clone 'git@github.com:Alhadis/$*.git'


# Link dependencies from globally-installed modules, because NPM can't be
# trusted with symbolic links in `node_modules` directories (apparently).
node_modules:
	[ -d "$@" ] || mkdir "$@";

node_modules/%: node_modules
	npm install --global $*@latest && ln -sf "`npm root -g`/$*" "$@"

node_modules/roff: node_modules $(projects)/Roff.js
	[ -h "$@" ] || rm -rf "$@"
	ln -s "$(projects)/Roff.js" $@
	cd $@ && $(MAKE) umd

node_modules/jg: node_modules $(projects)/JG
	[ -h "$@" ] || rm -rf "$@"
	ln -s "$(projects)/JG" $@


# Install a hook to prevent fucked indentation being committed to version control
hooks: .git/hooks/pre-commit
	
.git/hooks/pre-commit:
	@ printf >  $@ '#!/bin/sh\n'
	@ printf >> $@ 'exec 1>&2\n'
	@ printf >> $@ 'grep -qm1 "^  " config.cson && {\n'
	@ printf >> $@ '\techo >&2 "config.cson contains fucked indentation"\n'
	@ printf >> $@ '\texit 2\n'
	@ printf >> $@ '}\n'
	@ chmod  +x $@
	@ echo "Installed: $@"


# Convert YASnippets into something Atom understands
snippets:
	@cwd=`pwd`; \
	{ [ -d ~/Labs/YASR/.git ] && cd ~/Labs/YASR; } || \
	{ [ -d ~/.atom/snippets ] && cd ~/.atom/snippets; } || { \
		git clone 'git@github.com:Alhadis/YASR.git' snippets; \
		cd snippets || exit $?; \
	}; \
	$(MAKE) cson && mv snippets.cson "$$cwd/";
.PHONY: snippets


# Regenerate list of installed packages
packages/Makefile:
	@ignore=`git ls-tree HEAD:packages | cut -f2`; \
	pkglist=`apm list -bi --no-dev --no-versions \
	| grep -vF "$$ignore" \
	| grep -vi '\.tmBundle$$' \
	| sort -df`; all=""; git=""; \
	cwd=$(PWD); \
	end=`sed -ne '/^\.PHONY:/,//p' "$@"`; \
	for i in $$pkglist; do \
		case $${i#language-} in markdown|jison);; *) \
			dir=~/.atom/packages/$$i/.git; \
			[ -d "$$dir" ] && { \
				cd "$$dir/.."; \
				url=`git remote get-url origin`; \
				git=`printf "%s%s:\n\tgit clone '%s' \\$$@\nZ" "$$git" "$$i" "$$url"`; \
				[ ! "$$i" = postscript ] && { \
					git=`printf '%s\tcd $$@ && apm install .Z' "$${git%Z}"`; \
					git=`printf '%s && npm run-script --if-present post-install\n\nZ' "$${git%Z}"`; \
				} || git=`printf '%s\tcd $$@ && npm install --production\n\nZ' "$${git%Z}"`; \
				git="$${git%Z}"; \
			}; \
		;; esac; \
		all=`printf '%s%s\nZ' "$$all" "$$i"`; \
		all=$${all%Z}; \
	done; \
	cd $$cwd; (\
		printf 'all: \\\n'; \
		printf '%s\n' "$$all" \
		| sed -e 's/^\(.\)/'"`printf '\t'`"'\1/' \
		| sed -e 's/\([^[:blank:]]\)$$/\1 \\/'; \
		printf '\n%s%s\n' "$$git" "$$end"; \
	) > $@;
.PHONY: packages/Makefile


# Backup all packages installed using apm(1)
apm-packages.tgz: packages
	[ ! -f $@ ] || rm -f $@
	find packages -type d -maxdepth 1 -exec git check-ignore -q {} \; \( \
		-exec test \! -d "{}/.git" \; -or \
		-exec sh -c 'git 2>/dev/null -C {}/.git/.. remote get-url origin | grep -qv Alhadis' \; \
	\) -print0 | xargs -0 tar -czf $@ --


# Character-name lists sourced from ascii(1) utility's repo
ascii-info: node_modules/record-jar dev/ascii

dev/ascii:
	git -C dev clone 'https://gitlab.com/esr/ascii.git'
