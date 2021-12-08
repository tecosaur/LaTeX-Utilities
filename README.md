### <img src="https://i.ibb.co/X3PVszN/warning-5-64.png" alt="warning-5-64" border="0" height="16em"> Warning — looking for a maintainer

**This extension is no longer maintained.** I'm sorry, it's not you, it's me. I still love this functionality, I've just moved to a different editor to get it.
I don't want to leave you in the lurch, but I find it somewhat difficult to spend much time on an extension for an editor I no longer use.
That said, while I may not be planning on doing any work myself, _I will gladly accept PRs_. New functionality? Bug fix? Don't let me stop you: **PR!**

<p align="center"><a href="https://github.com/tecosaur/LaTeX-Utilities" target="_blank" rel="noopener noreferrer"><img width="100" src="https://github.com/tecosaur/LaTeX-Utilities/raw/master/icon.png" alt="LaTeX Utils logo"></a></p>

<p align="center">

<a href="https://marketplace.visualstudio.com/items?itemName=tecosaur.latex-utilities&">
<img alt="version" src="https://vsmarketplacebadge.apphb.com/version-short/tecosaur.latex-utilities.svg?style=flat-square&color=579983&logo=visual-studio-code&logoColor=C6EDE2"/></a>
<a href="https://vsmarketplacebadge.apphb.com/downloads-short/tecosaur.latex-utilities.svg">
<img alt="downloads" src="https://vsmarketplacebadge.apphb.com/downloads-short/tecosaur.latex-utilities.svg?style=flat-square&color=579983"/></a>
<a href="https://marketplace.visualstudio.com/items?itemName=tecosaur.latex-utilities">
<img alt="installs" src="https://vsmarketplacebadge.apphb.com/installs-short/tecosaur.latex-utilities.svg?style=flat-square&color=579983"/></a>
<a href="https://marketplace.visualstudio.com/items?itemName=tecosaur.latex-utilities">
<img alt="rating" src="https://vsmarketplacebadge.apphb.com/rating-short/tecosaur.latex-utilities.svg?style=flat-square&color=579983"/></a>

<br/>

<a href="https://www.codefactor.io/repository/github/tecosaur/latex-utilities">
<img src="https://www.codefactor.io/repository/github/tecosaur/latex-utilities/badge?style=flat-square&color=579983" alt="CodeFactor"/></a>
<a href="https://github.com/tecosaur/LaTeX-Utilities/issues">
<img alt="GitHub issues" src="https://img.shields.io/github/issues/tecosaur/LaTeX-Utilities?color=579983&style=flat-square"></a>
<a href="https://github.com/tecosaur/LaTeX-Utilities/commits/master">
<img alt="GitHub last commit" src="https://img.shields.io/github/last-commit/tecosaur/LaTeX-Utilities?color=579983&style=flat-square"></a>

<a href="https://raw.githubusercontent.com/James-Yu/LaTeX-Workshop/master/LICENSE.txt">
<img alt="license" src="https://img.shields.io/badge/license-MIT-brightgreen.svg?style=flat-square&color=579983"/></a>

</p>

<h1 align="center">LaTeX Utilities</h1>

An add-on to the vscode extension [LaTeX Workshop](https://marketplace.visualstudio.com/items?itemName=James-Yu.latex-workshop) that provides some fancy features that are less vital to the basic experience editing a LaTeX document, but can be rather nice to have.
The feature should continue to expand at a gradually decreasing rate.

Got an idea? Make a PR!
<a href="https://gitpod.io/#https://github.com/tecosaur/LaTeX-Utilities">
<img align="right" width="100" alt="Open in Gitpod" src="https://gitpod.io/button/open-in-gitpod.svg"/></a>

<hr/>

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
-   A LaTeX installation in your path
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

<br/>
<br/>

---

## Telemetry

### Why

As a bunch of fancy, but non-essential features, it can be hard to know what features users actually derive value from.
In adding telemetry to this extension I hope to get an idea of this, and inform future development efforts.
It should also be possible to report errors in the background, and so I also hope this extension will be more stable as a result.

At the moment I'm just logging when one of the main features is used.

**TLDR; I want to get around the 1% rule**

### I hate telemetry, go away!

You probably have disabled vscode's `telemetry.enableTelemetry` then, in which case no telemetry is done.
