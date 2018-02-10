all: clean-junk

clean-junk:
	rm -f init.coffee

install:
	cd packages && $(MAKE)


.PHONY: packages/Makefile
packages/Makefile:
	@pkglist=`apm list -bi --no-dev \
	| sed 's/@[^@]*$$//' \
	| grep -v 'biro-syntax' \
	| grep -v '^[[:blank:]]*$$' \
	| sort -df`; all=""; git=""; \
	for i in $$pkglist; do \
		dir=~/.atom/packages/$$i/.git; \
		[ -d "$$dir" ] && { \
			cd "$$dir/.."; \
			url=`git remote get-url origin`; \
			git=`printf '%s%s:\n\tgit clone "%s" $$@\nZ' "$$git" "$$i" "$$url"`; \
			git=`printf '%s\tcd $$@ && apm install .\n\nZ' "$${git%Z}"`; \
			git="$${git%Z}"; \
		}; \
		all=`printf '%s%s\nZ' "$$all" "$$i"`; \
		all=$${all%Z}; \
	done; \
	>  $@ printf ""; \
	>> $@ printf 'all: \\\n'; \
	>> $@ printf '%s\n' "$$all" | sed -e 's/^/\t/; s/\([^[:blank:]]\)$$/\1 \\/'; \
	>> $@ printf '\n%s' "$$git"; \
	>> $@ printf '%%:; apm install $$*\n.PHONY: all\n'


# Undo Project-Manager's whitespace molestation
projects = src/configs/projects.cson
could-you-not:
	@~/.files/bin/edit -e 's/  /\t/g' $(projects)
.PHONY: could-you-not
