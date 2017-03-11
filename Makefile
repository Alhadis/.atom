all: relink install

theme-dir   := ~/Labs/Atom-PhoenixTheme
user-dir    := ~/.atom
package-dir := ~/.atom/packages

linked-user-files := \
	config.cson \
	keymap.cson \
	projects.cson \
	snippets.cson \
	styles.less \
	init.js


# Community Atom packages
installed-packages := \
	advanced-open-file \
	aesthetic-ui \
	atom-hg \
	atom-material-syntax \
	atom-material-syntax-dark \
	atom-material-syntax-light \
	atom-material-ui \
	auto-detect-indentation \
	behave-theme \
	duotone-dark-syntax \
	duotone-light-syntax \
	editorconfig \
	flatland-dark-ui \
	git-blame \
	language-68hc11-assembly \
	language-antlr \
	language-apache \
	language-applescript \
	language-arm \
	language-asciidoc \
	language-awk \
	language-batchfile \
	language-bnf \
	language-crystal-actual \
	language-diff \
	language-docker \
	language-erlang \
	language-fortran \
	language-generic-config \
	language-haskell \
	language-idl \
	language-ini \
	language-latex \
	language-lisp \
	language-llvm \
	language-lua \
	language-ninja \
	language-pascal \
	language-postscript \
	language-rust \
	language-x86 \
	language-x86-64-assembly \
	lines \
	lisp-paredit \
	MagicPython \
	make-executable \
	minimap \
	nucleus-dark-ui \
	project-manager \
	seti-syntax \
	seti-ui \
	sort-lines \
	theme-reel \
	toggle-quotes \
	yosemate-ui


# Symlinked packages maintained locally
symlinks = \
	file-icons \
	Phoenix-Syntax \
	regex-comments \
	$(symlinked-forks) \
	$(symlinked-projects)

symlinked-forks := \
	language-gn \
	language-restructuredtext \
	language-viml

symlinked-projects := \
	language-agc \
	language-apl \
	language-emacs-lisp \
	language-file-magic \
	language-fontforge \
	language-maxscript \
	language-regexp \
	language-roff \
	language-turing \
	language-wavefront


# Keep config files tracked by version control
$(user-dir): $(addprefix ~/.atom/,$(linked-user-files))

~/.atom/%: $(theme-dir)/src/configs/%
	ln -s $^ $@

~/.atom/styles.less: $(theme-dir)/styles/index.less
	ln -s $^ $@

~/.atom/config.cson: $(theme-dir)/src/configs/user-config.cson
	ln -s $^ $@

~/.atom/init.js: $(theme-dir)/src/index.js
	ln -s $^ $@


# Package directory
$(package-dir):
	mkdir $@

# Install community packages
install: $(user-dir) $(package-dir) $(addprefix $(package-dir)/,$(installed-packages))

$(package-dir)/%:
	apm install $*


# Symlink locally-managed packages
relink: $(package-dir) $(addprefix $(package-dir)/,$(symlinks))

$(package-dir)/file-icons:
	ln -s ~/Labs/file-icons $@

$(package-dir)/Phoenix-Syntax:
	ln -s $(theme-dir) $@

$(package-dir)/regex-comments:
	ln -s ~/Labs/Regex-Comments $@

$(addprefix $(package-dir)/,$(symlinked-forks)):
	ln -s ~/Forks/$(@F) $@

$(addprefix $(package-dir)/,$(symlinked-projects)):
	ln -s ~/Labs/$(@F) $@



# Undo Project-Manager's whitespace molestation
could-you-not:
	@$$(git diff --exit-code --quiet -w $(projects)) && git checkout -- $(projects)

.PHONY: could-you-not
projects := user/projects.cson



# Update list of installed packages
package-list:
	@packages=$$(apm list --bare --installed --no-dev --no-links | sed -r 's/@[^@]+$$//; /^\s*$$/d' | sort -df); \
	perl -i -p0e '$$L="'"$$(echo $$packages)"'";$$L=~s/\s+/ \\\n\t/g;s|installed-packages\s*:=\s*\\\n\K(?:.+\\\n)+\s*\S+.*$$|\t$$L|m' \
		$(abspath $(lastword $(MAKEFILE_LIST)))
