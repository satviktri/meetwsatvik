# Meeting Notebook

A single-page, aesthetic meeting companion that lets you capture meeting notes, keep track of todos, and jot down side ideas without losing focus.

## Features

- **Meeting note tab** with a guided form, quick template button, tag for meeting focus, and a searchable, filterable history that lets you edit or remove previous notes.
- **GitHub sync** card that automatically targets `satviktri/meetwsatvik/data/meetings.json` so your meeting history lives in this repo and can be pulled from anywhere.
- **To-do tab** that supports due dates, priorities, completion state, filters, and a live counter of outstanding tasks.
- **Side notes tab** acting as a scratchpad with autosave and a one-click clear button.
- **Theme toggle** between a bright and a dark mode plus persistent storage through `localStorage`.

## Getting started

Open the `index.html` file in any modern browser. All data is stored locally in your browser, so there is nothing to deploy or configure.

### Saving meetings to GitHub

Previous meetings automatically sync to `satviktri/meetwsatvik/data/meetings.json`.

1. In the **GitHub sync** card, paste a GitHub personal access token (classic or fine-grained) with access to this repository. The token stays in your browser and is required only for pushing changes.
2. Click **Pull latest** to hydrate a new browser with the JSON stored in the repo.
3. Click **Push now** (or toggle on auto-sync) to send your updated history back to GitHub whenever meetings change.

Tokens are saved only in your browser's localStorage and are never transmitted anywhere except directly to GitHub's API.
