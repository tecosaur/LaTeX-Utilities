# Change Log

## [Unreleased]

### Added

-   Word Count
-   TikZ Preview
    -   Adds a code lense above `\begin{tikzpicture}` that allows for live previewing

### Improved

-   Full formatted paste features, `ctrl`+`shift`+`v`

    -   Reformats some Unicode text for LaTeX
    -   Table cells are turned into a `tabular`
    -   Pasting the location of a `.csv` file pastes a table with the contents
    -   Paste an image from the clipboard (as in 0.1.0)
    -   Formatted paste the path to a csv (adds tabular) or image file (links to file)

-   Live Snippets: added more mathematics environments to environment (text/maths) detection code

### Fixed

-   Live Snippets: Big! bug with environment (text/maths) detection code

## [0.1.0]

### Added

-   Image Pasting (via `ctrl`+`shift`+`v` and "Paste an Image File")
-   Live Snippets (auto-activating, with regex)
