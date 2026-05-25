# Comment Mode

Comment mode is Decknow's AI-native edit loop for local development. Users do
not edit the deck directly. They select rendered elements, write comments about
what should change, and submit those comments for an AI agent to apply to the
source.

## Modes

`decknow dev <entry>` is the development mode. It serves the deck through a local
HTTP server and injects a comment overlay. The source HTML and final presentation
runtime do not include the overlay.

Opening the HTML file directly, or using a future build output, is presentation
mode. Presentation mode has no comment UI, no local comment API, and no server
dependency.

## User Flow

1. The user opens the dev server URL.
2. A floating Comment button appears in the lower-right corner.
3. Clicking the button opens comment mode.
4. Hovering over semantic `dk-*` elements shows a highlight.
5. Clicking a highlighted element locks the selection and opens a comment panel.
6. The user writes a comment and saves it into the current round.
7. The user can navigate across slides and add more comments.
8. Submitting the round persists all saved comments to disk.
9. An AI agent reads the latest round with `decknow comments latest`.

Hover only previews a target. Click locks the target. Moving the pointer after a
target is locked must not change the comment target.

While a target is locked, normal page clicks are passed through so users can
select and copy rendered text without accidentally changing the comment target.
Saving or canceling the current comment returns to target selection.

The user can cancel the current selection with the panel cancel button or the
Escape key. If no element is selected, Escape exits comment mode.

## CLI Output

The dev server prints natural-language events to stdout. It does not print the
full comment payload.

When comment mode opens:

```txt
Comment mode opened. The user may add comments across multiple slides.
```

When a round is submitted:

```txt
Comment round 3 submitted with 5 comments.
Run `decknow comments latest` to read this round.
```

## Comment Rounds

Each submit creates one numeric round. A round can contain comments from multiple
slides. Each individual comment stores its own slide number and target metadata.

The CLI commands return JSON by default:

```bash
decknow comments list
decknow comments latest
decknow comments show 3
```

## Storage

Comment rounds are written to a local runtime directory under the caller's
working directory:

```txt
.decknow-runs/comments/
  index.json
  round-1.json
  round-2.json
```

This directory is a local development artifact for the current project. Whether
it is ignored by Git is the caller's project decision.
