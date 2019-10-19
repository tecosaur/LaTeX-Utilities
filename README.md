# <img src="https://github.com/tecosaur/LaTeX-Utilities/raw/master/icon.png" height="26px"> LaTeX Utilities

[![version](https://vsmarketplacebadge.apphb.com/version-short/tecosaur.latex-utilities.svg?style=flat-square&color=579983&logo=visual-studio-code&logoColor=C6EDE2)](https://marketplace.visualstudio.com/items?itemName=tecosaur.latex-utilities&)
[![downloads](https://vsmarketplacebadge.apphb.com/downloads-short/tecosaur.latex-utilities.svg?style=flat-square&color=579983)](https://vsmarketplacebadge.apphb.com/downloads-short/tecosaur.latex-utilities.svg)
[![installs](https://vsmarketplacebadge.apphb.com/installs-short/tecosaur.latex-utilities.svg?style=flat-square&color=579983)](https://marketplace.visualstudio.com/items?itemName=tecosaur.latex-utilities)
[![rating](https://vsmarketplacebadge.apphb.com/rating-short/tecosaur.latex-utilities.svg?style=flat-square&color=579983)](https://marketplace.visualstudio.com/items?itemName=tecosaur.latex-utilities)
[![license](https://img.shields.io/badge/license-MIT-brightgreen.svg?style=flat-square&color=579983)](https://raw.githubusercontent.com/James-Yu/LaTeX-Workshop/master/LICENSE.txt)

<!-- [![Average time to resolve an issue](https://isitmaintained.com/badge/resolution/tecosaur/LaTeX-Utilities.svg)](https://github.com/tecosaur/LaTeX-Utilities/issues)
[![Percentage of issues still open](https://isitmaintained.com/badge/open/tecosaur/LaTeX-Utilities.svg)](https://github.com/tecosaur/LaTeX-Utilities/issues) -->

An add-on to the vscode extension [LaTeX Workshop](https://marketplace.visualstudio.com/items?itemName=James-Yu.latex-workshop) that provides some fancy features that are less vital to the basic experience editing a LaTeX document, but can be rather nice to have.
The feature should continue to expand at a gradually decreasing rate.

## Features

-   Formatted Pastes
    -   Unicode characters 🡒 LaTeX characters (e.g. `“is this… a test”` 🡒 ` ``is this\ldots a test'' `)
    -   Paste table cells (from spreadsheet programs or similar) 🡒 tabular
    -   Paste images, customisable template
    -   Paste location of CSVs/images to have them included
-   Live Snippets (auto-activating, with regex) [see here](https://github.com/tecosaur/LaTeX-Utilities/wiki/Live-Snippets) for documentation
-   Count Words in a LaTeX Document
-   TikZ Preview
-   Zotero citation management

## Documentation

-   See the [wiki](https://github.com/tecosaur/LaTeX-Utilities/wiki)

## Requirements

-   ![LaTeX Workshop](https://vsmarketplacebadge.apphb.com/version/James-Yu.latex-workshop.svg?subject=LaTeX%20Workshop&color=597297&style=flat-square)
-   A LaTeX instillation in your path
-   The [`texcount`](https://app.uio.no/ifi/texcount/) script (only necessary for the word-count function). Configure using the `latex-utilities.countWord.path` and `latex-utilities.countWord.args` settings.
-   Zotero with the [Better BibTeX extension](https://retorque.re/zotero-better-bibtex/) (only necessary for Zotero
    functions).

## Demos

### Formatted Paste (image)

<img src="https://github.com/tecosaur/LaTeX-Utilities/raw/master/demo-media/formattedPasteImage.gif" height="160px">

### Live Snippets

<img src="https://github.com/tecosaur/LaTeX-Utilities/raw/master/demo-media/liveSnippets.gif" height="30px">

### TikZ Preview

<img src="https://github.com/tecosaur/LaTeX-Utilities/raw/master/demo-media/tikz-preview.gif" height="120px">

### Zotero Integration

<img src="https://github.com/tecosaur/LaTeX-Utilities/raw/master/demo-media/zotero-integration.gif" height="100px">

## Telemetry

This extension uses telemetry (If your response is best described by 🤢 I understand).

### Why

As a bunch of fancy, but non-essential features, it can be hard to know what features users actually derive value from.
In adding telemetry to this extension I hope to get an idea of this, and inform future development efforts.
It should also be possible to report errors in the background, and so I also hope this extension will be more stable as a result.

At the moment I'm just logging when one of the main features is used.

**TLDR; I want to get around the 1% rule**

### I hate telemetry, go way!

You probably have disabled vscode's `telemetry.enableTelemetry` then, in which case no telemetry is done.
