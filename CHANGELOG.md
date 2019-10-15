# Change Log

## [unreleased]

### Added

-   Customisable wordcount status

### Improved

-   Formatted paste now shapes text to line length
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

[unreleased]: https://github.com/tecosaur/latex-utilities/compare/v0.3.1...HEAD
[0.3.1]: https://github.com/tecosaur/latex-utilities/compare/v0.3.0...v0.3.1
[0.3.0]: https://github.com/tecosaur/latex-utilities/compare/v0.2.2...v0.3.0
[0.2.2]: https://github.com/tecosaur/latex-utilities/compare/v0.2.1...v0.2.2
[0.2.1]: https://github.com/tecosaur/latex-utilities/compare/v0.2.0...v0.2.1
[0.2.0]: https://github.com/tecosaur/latex-utilities/compare/v0.1.0...v0.2.0
[0.1.0]: https://github.com/tecosaur/latex-utilities/compare/bc5bf4f...v0.1.0
