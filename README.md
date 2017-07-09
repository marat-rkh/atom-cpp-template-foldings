# atom-cpp-template-foldings
Atom plugin that folds C++ template definitions to make them more readable.

## Description

C++ template definitions are wordy. This plugin finds all templates in your source file and folds their parameter lists making some simplifications. For example:

![Alt Text](https://github.com/octomarat/atom-cpp-template-foldings/resources/demo.gif)

Here folding hides `typename` keywords.

Simplification rules are very simple:

* type template parameter: `typename` and `class` keywords are removed; if parameter has no name, `_` symbol is displayed;
* non type template parameters: not simpified;
* template template parameters: parameters are simplified recursively; `typename` and `class` keywords are removed; if parameter has no name, `_` symbol is displayed.

The example below demonstates most of these cases:

![Alt Text](https://github.com/octomarat/atom-cpp-template-foldings/resources/demo-complex.gif)

You can apply foldings manually or turn on auto folding on file open (from package settings).

## Installation

Just install the package from Atom (Edit > Prederences > Install > [type 'atom-cpp-template-foldings']).

## Current issues

* Templates that contain tab charactes are not processed. So, if you use tabs to indent your code, multiline template parameter lists will not be processed.
* Folding is not performed when `Soft Wrap` option is enabled in Atom. However, if you also enable `Soft Wrap At Preferred Line Length`, everything will work.
