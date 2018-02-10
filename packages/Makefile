all: \
	MagicPython \
	advanced-open-file \
	aesthetic-ui \
	atom-material-syntax \
	atom-material-syntax-dark \
	atom-material-syntax-light \
	atom-material-ui \
	auto-detect-indentation \
	behave-theme \
	duotone-dark-syntax \
	duotone-light-syntax \
	editorconfig \
	file-icons \
	flatland-dark-ui \
	git-blame \
	language-agc \
	language-antlr \
	language-apache \
	language-apl \
	language-applescript \
	language-asciidoc \
	language-awk \
	language-batchfile \
	language-bnf \
	language-common-lisp \
	language-crystal-actual \
	language-diff \
	language-docker \
	language-ebnf \
	language-emacs-lisp \
	language-erlang \
	language-file-magic \
	language-fontforge \
	language-fortran \
	language-generic-config \
	language-glsl \
	language-gn \
	language-haskell \
	language-idl \
	language-ini \
	language-latex \
	language-llvm \
	language-lua \
	language-mathematica \
	language-maxscript \
	language-ninja \
	language-pascal \
	language-pcb \
	language-postscript \
	language-regexp \
	language-restructuredtext \
	language-roff \
	language-rpm-spec \
	language-rust \
	language-scheme \
	language-svg \
	language-tmux \
	language-turing \
	language-viml \
	language-wavefront \
	language-webassembly \
	language-x86-64-assembly \
	lisp-paredit \
	make-executable \
	minimap \
	pdf-view \
	project-manager \
	regex-comments \
	seti-syntax \
	seti-ui \
	theme-reel \
	toggle-quotes \
	yosemate-ui \


file-icons:
	git clone 'git@github.com:file-icons/atom.git' $@
	cd $@ && apm install .

language-gn:
	git clone 'git@github.com:Alhadis/language-gn.git' $@
	cd $@ && apm install .

regex-comments:
	git clone 'git@github.com:Alhadis/Regex-Comments.git' $@
	cd $@ && apm install .

language-restructuredtext:
	git clone 'git@github.com:Lukasa/language-restructuredtext.git' $@
	cd $@ && apm install .

language-viml:
	git clone 'git@github.com:Alhadis/language-viml.git' $@
	cd $@ && apm install .

language-agc:
	git clone 'git@github.com:Alhadis/language-agc.git' $@
	cd $@ && apm install .

language-apl:
	git clone 'git@github.com:Alhadis/language-apl.git' $@
	cd $@ && apm install .

language-emacs-lisp:
	git clone 'git@github.com:Alhadis/language-emacs-lisp.git' $@
	cd $@ && apm install .

language-file-magic:
	git clone 'git@github.com:Alhadis/language-file-magic.git' $@
	cd $@ && apm install .

language-fontforge:
	git clone 'git@github.com:Alhadis/language-fontforge.git' $@
	cd $@ && apm install .

language-maxscript:
	git clone 'git@github.com:Alhadis/language-maxscript.git' $@
	cd $@ && apm install .

language-pcb:
	git clone 'git@github.com:Alhadis/language-pcb.git' $@
	cd $@ && apm install .

language-regexp:
	git clone 'git@github.com:Alhadis/language-regexp.git' $@
	cd $@ && apm install .

language-roff:
	git clone 'git@github.com:Alhadis/language-roff.git' $@
	cd $@ && apm install .

language-turing:
	git clone 'git@github.com:Alhadis/language-turing.git' $@
	cd $@ && apm install .

language-wavefront:
	git clone 'git@github.com:Alhadis/language-wavefront.git' $@
	cd $@ && apm install .

language-webassembly:
	git clone 'git@github.com:Alhadis/language-webassembly.git' $@
	cd $@ && apm install .

%:; apm install $*
.PHONY: all
