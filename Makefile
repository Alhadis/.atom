all: install

install: node_modules/alhadis.utils
	rm -f init.coffee
	rm -f package-lock.json
	cd packages && $(MAKE)


# Dependencies
node_modules:
	[ -d "$@" ] || mkdir "$@";

node_modules/alhadis.utils: node_modules
	[ -e "$@" ] || { \
		[ -d ~/Labs/Utils/.git ] && ln -s ~/Labs/Utils $@ || \
		git clone 'git@github.com:Alhadis/Utils.git' $@; \
		cd $@ && $(MAKE); \
	};

node_modules/%: node_modules
	(npm install $* 2>&1) >/dev/null; true


# Regenerate list of installed packages
packages/Makefile:
	@pkglist=`apm list -bi --no-dev \
	| sed 's/@[^@]*$$//' \
	| grep -v 'biro-syntax' \
	| grep -v '^[[:blank:]]*$$' \
	| sort -df`; all=""; git=""; \
	cwd=$(PWD); \
	for i in $$pkglist; do \
		dir=~/.atom/packages/$$i/.git; \
		[ -d "$$dir" ] && { \
			cd "$$dir/.."; \
			url=`git remote get-url origin`; \
			git=`printf "%s%s:\n\tgit clone '%s' \\$$@\nZ" "$$git" "$$i" "$$url"`; \
			git=`printf '%s\tcd $$@ && apm install .\n\nZ' "$${git%Z}"`; \
			git="$${git%Z}"; \
		}; \
		all=`printf '%s%s\nZ' "$$all" "$$i"`; \
		all=$${all%Z}; \
	done; \
	cd $$cwd; (\
		printf 'all: \\\n'; \
		printf '%s\n' "$$all" | sed -e 's/^\(.\)/\t\1/; s/\([^[:blank:]]\)$$/\1 \\/'; \
		printf '\n%s' "$$git"; \
		printf '%%:; apm install $$*\n.PHONY: all\n'; \
	) > $@;
.PHONY: packages/Makefile


# Undo Project-Manager's whitespace molestation
projects = src/configs/projects.cson
could-you-not:
	@~/.files/bin/edit -e 's/  /\t/g' $(projects)
.PHONY: could-you-not
