=head1 C<E<0x3D>for> TESTS

=head2 Multi-line paragraphs

=for comment This is a comment
inside what's technically another comment.

=for roff .
.SH DIATRIBE
\fINOW\fP we\(cqre in my comfort zone.
Too bad we don\(cqt get to choose the macro package, eh?

=for tex a \times \sqrt{{b ^ 2} ^
2 \over {c_1 + d_2}}

=for latex \usepackage{lingmacros}
\usepackage{tree-dvips}
\begin{document}

=for html <span class="monospaced">Why would you write this</span>,
when <tt>you could write this</tt>? And <em>don't</em> give me that
<q>because it's not semantic markup</q> crap, you know as well as I
do that <b>&lt;b&gt;</b>, <i>&lt;i&gt;</i> and <u>&lt;u&gt;</u> are
only included in modern HTML for compatibility with existing markup.
So why not include &lt;tt&gt; for the same reasons?

=for unknown This is output for an
unrecognised formmat type.

=for text [2026-01-20T04:16:12.847+11:00]   bogus_log_file()   Some event
[2026-01-20T04:17:02.434+11:00]   bogus_log_file()   Another event



=head2 Separate-line C<E<0x3D>for> paragraphs

=for comment
This is a comment inside what's technically another comment.

=for roff
.SH DIATRIBE
\fINOW\fP we\(cqre in my comfort zone.
Too bad we don\(cqt get to choose the macro package, eh?

=for tex
a \times \sqrt{{b ^ 2} ^ 2 \over {c_1 + d_2}}

=for latex
\usepackage{lingmacros}
\usepackage{tree-dvips}
\begin{document}

=for html
<span class="monospaced">Why would you write this</span>,
when <tt>you could write this</tt>? And <em>don't</em> give me that
<q>because it's not semantic markup</q> crap, you know as well as I
do that <b>&lt;b&gt;</b>, <i>&lt;i&gt;</i> and <u>&lt;u&gt;</u> are
only included in modern HTML for compatibility with existing markup.
So why not include &lt;tt&gt; for the same reasons?

=for unknown
This is output for an unrecognised formmat type.

=for text
[2026-01-20T04:16:12.847+11:00]   bogus_log_file()   Some event
[2026-01-20T04:17:02.434+11:00]   bogus_log_file()   Another event
