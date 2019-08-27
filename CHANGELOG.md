# Change Log

## [Unreleased]

### Fixed

-   Some of the default live snippets were a bit dodgy

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

[unreleased]: https://github.com/tecosaur/latex-utilities/compare/v0.2.2...HEAD
[0.2.2]: https://github.com/tecosaur/latex-utilities/compare/v0.2.1...v0.2.2
[0.2.1]: https://github.com/tecosaur/latex-utilities/compare/v0.2.0...v0.2.1
[0.2.0]: https://github.com/tecosaur/latex-utilities/compare/v0.1.0...v0.2.0
[0.1.0]: https://github.com/tecosaur/latex-utilities/compare/bc5bf4f...v0.1.0
