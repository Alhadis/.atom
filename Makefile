all: init.js install hooks snippets clean watch

install: node_modules/roff node_modules/prompt-view hooks
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


# Monitor `config.cson` for changes to keep Atom's shitty code-style out of my repository
watch:
	@ watchman -- trigger $(PWD) unfuck config.cson -- ./unfuck-config >/dev/null
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


# Install/link dependencies
node_modules:
	[ -d "$@" ] || mkdir "$@";

node_modules/roff: node_modules
	[ -e "$@" ] || { \
		[ -d ~/Labs/Roff.js/.git ] && ln -s ~/Labs/Roff.js $@ || \
		git clone 'git@github.com:Alhadis/Roff.js.git' $@; \
		cd $@ && $(MAKE); \
	};

node_modules/%: node_modules
	(npm install $* 2>&1) >/dev/null; true


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
	@pkglist=`apm list -bi --no-dev \
	| sed 's/@[^@]*$$//' \
	| grep -v '^biro-syntax$$' \
	| grep -v '^patches$$' \
	| grep -v '^injections$$' \
	| grep -v '^language-not-mine$$' \
	| grep -v '^[[:blank:]]*$$' \
	| sort -df`; all=""; git=""; \
	cwd=$(PWD); \
	end=`sed -ne '/^\.PHONY:/,//p' "$@"`; \
	for i in $$pkglist; do \
		dir=~/.atom/packages/$$i/.git; \
		[ -d "$$dir" ] && { \
			cd "$$dir/.."; \
			url=`git remote get-url origin`; \
			git=`printf "%s%s:\n\tgit clone '%s' \\$$@\nZ" "$$git" "$$i" "$$url"`; \
			git=`printf '%s\tcd $$@ && apm install .Z' "$${git%Z}"`; \
			git=`printf '%s && npm run-script --if-present post-install\n\nZ' "$${git%Z}"`; \
			git="$${git%Z}"; \
		}; \
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
