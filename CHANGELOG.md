# Change Log

## [0.4.0] - 2022-07-06
New maintainer!
- Removed dependency on LaTeX-Workshop.
- Removed support for TiKZ live preview temporarily.
- Fixed pasting image inside WSL.
- Move from NPM to yarn.

## [0.3.7] — 2020-05-22

Announce that extension is no longer maintained.

## [0.3.6] — 2020-02-01

### Fixed

-   API changed in `got` breaking Zotero citation search.

## [0.3.5] — 2020-02-01

### Added

-   Command to reset user live snippets file
-   Command to compare user live snippets file to default
-   Basic support for bulleted lists in formatted paste
-   Notification on extension update
-   Notify users when save/close a user live snippets file same as the extension default

### Improved

-   Tweak default live snippets (yet again, again)
-   Account for indent when formatted-pasting text
-   Try to avoid plaintext 🡒 LaTeX formatting already LaTeX formatted pastes
-   Determination of maths/text type at cursor gets it wrong a bit less

### Fixed

-   Formatted pasting a single line of text with cursor at non-zero column resulted in text being cut out
-   Account for inconsistency in `texcount` output
-   Add `\pgfplotsset{table/search path=...` to TikZ Preview to (hopefully) fix local file references

## [0.3.4] — 2019-11-02

### Added

-   TikZ Preview `timeout` setting, to ignore the first change made after a certain period
-   JSON validation schema for live snippets file

### Improved

-   TikZ Preview now uses relevant lines prior to the `tikzpicture`
-   Make TikZ Preview work with any environment which matches `\w*tikz\w*`
-   Live snippets now treats comments inside a math environment as "text"
-   Lots of excess logging with live snippets removed
-   More tweaks to live snippets
-   Make formatted paste line shaping account for current column

### Fixed

-   TikZ Preview delay was dodgy
-   TeX Count 'results' line was incorrectly isolated

## [0.3.3] — 2019-10-19

### Added

-   Setting to make formatted paste the default (`ctrl`+`v`) paste
-   New setting for custom delimiter for formatted paste to try with tables
-   Telemetry to try to help direct development effort

### Improved

-   More tweaks to live snippets (`sr`, `cb` and superscripts)
-   Formatted paste of tables now 'just works' with anything which is tab, comma, or `|` delimited,
    i.e. spreadsheets, csv, markdown
-   Formatted paste of text now joins hyphenated words

## [0.3.2] — 2019-10-16

### Added

-   Customisable wordcount status
-   Formatted paste now shapes text to (configurable) line length

### Improved

-   Live snippets now do so more accents, and spaces

### Fixed

-   Live snippets can no longer do dodgy stuff when the replacement is the same length as the original

## [0.3.1] — 2019-09-27

### Improved

-   Live snippets are now a bit better again (see #42)

### Fixed

-   Some formatted-paste text replacements
-   LiveSnippets now recognise placeholder tabstops

## [0.3.0] — 2019-09-06

### Added

-   Add Zotero integration with BBT (Better BibTeX)

### Improved

-   Change placeholder style in snippets from `$.` to `$$`, because it seems cleaner.

### Fixed

-   Some of the default live snippets were a bit dodgy
-   Fixed #17 (cursor moving backwards too far with some live snippets)
-   TikZ Preview no longer grabs lines after `\begin{document}`
-   Fix up some of the text replacements done by formatted paste

## [0.2.2] — 2019-08-23

### Added

-   Toggle for the define command with `texdef` feature

## [0.2.1] — 2019-08-19

### Fixed

-   Demo images on marketplace page

## [0.2.0] — 2019-08-19

### Added

-   Word Count
-   TikZ Preview
    -   Adds a code lense above `\begin{tikzpicture}` that allows for live previewing
-   Command Definitions

### Improved

-   Full formatted paste features, `ctrl`+`shift`+`v`

    -   Reformats some Unicode text for LaTeX
    -   Table cells are turned into a `tabular`
    -   Pasting the location of a `.csv` file pastes a table with the contents
    -   Paste an image from the clipboard (as in 0.1.0)
    -   Formatted paste the path to a csv (adds tabular) or image file (links to file)

-   Live Snippets: added more mathematics environments to environment (text/maths) detection code
-   Live Snippets: may now be _marginally_ faster due to some behind-the-scenes reworking

### Fixed

-   Live Snippets: Big! bug with environment (text/maths) detection code

## [0.1.0] — 2019-07-31

### Added

-   Image Pasting (via `ctrl`+`shift`+`v` and "Paste an Image File")
-   Live Snippets (auto-activating, with regex)

[unreleased]: https://github.com/tecosaur/latex-utilities/compare/v0.3.7...HEAD
[0.4.0]: https://github.com/tecosaur/latex-utilities/compare/v0.3.7...v0.4.0
[0.3.7]: https://github.com/tecosaur/latex-utilities/compare/v0.3.5...v0.3.7
[0.3.6]: https://github.com/tecosaur/latex-utilities/compare/v0.3.5...v0.3.6
[0.3.5]: https://github.com/tecosaur/latex-utilities/compare/v0.3.4...v0.3.5
[0.3.4]: https://github.com/tecosaur/latex-utilities/compare/v0.3.3...v0.3.4
[0.3.3]: https://github.com/tecosaur/latex-utilities/compare/v0.3.2...v0.3.3
[0.3.2]: https://github.com/tecosaur/latex-utilities/compare/v0.3.1...v0.3.2
[0.3.1]: https://github.com/tecosaur/latex-utilities/compare/v0.3.0...v0.3.1
[0.3.0]: https://github.com/tecosaur/latex-utilities/compare/v0.2.2...v0.3.0
[0.2.2]: https://github.com/tecosaur/latex-utilities/compare/v0.2.1...v0.2.2
[0.2.1]: https://github.com/tecosaur/latex-utilities/compare/v0.2.0...v0.2.1
[0.2.0]: https://github.com/tecosaur/latex-utilities/compare/v0.1.0...v0.2.0
[0.1.0]: https://github.com/tecosaur/latex-utilities/compare/bc5bf4f...v0.1.0
