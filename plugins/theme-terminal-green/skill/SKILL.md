---
name: decknow-theme-terminal-green
description: Use and maintain Decknow's built-in terminal-green theme. Use when a deck or system change involves default theme tokens, typography, surfaces, colors, spacing, or theme/runtime styling boundaries.
---

# Decknow Theme Terminal Green

`terminal-green` is the default bundled Decknow theme.

The theme owns visual tokens:

- `colorScheme: "dark"` so runtime chrome can choose the correct built-in dark
  treatment for navigation, comments, and system UI
- colors and accents
- typography tokens
- spacing tokens
- surfaces, borders, and shadows
- decorative theme variables

The core runtime owns structure:

- viewport fitting
- slide stage aspect behavior
- layout mechanics
- element display defaults
- navigation and comment affordances

When fixing a visual issue, decide whether it is truly a theme token problem or
a core layout problem. Do not hide core layout bugs by overriding them in the
theme.
