# Meeting Notebook

A single-page, aesthetic meeting companion that lets you capture meeting notes, keep track of todos, and jot down side ideas without losing focus.

## Features

- **Meeting note tab** with a guided form, quick template button, tag for meeting focus, and a searchable, filterable history that lets you edit or remove previous notes.
- **GitHub sync** card that can push your previous meetings JSON to any repository/folder so you can pull the history from any browser.
- **To-do tab** that supports due dates, priorities, completion state, filters, and a live counter of outstanding tasks.
- **Side notes tab** acting as a scratchpad with autosave and a one-click clear button.
- **Theme toggle** between a bright and a dark mode plus persistent storage through `localStorage`.

## Getting started

Open the `index.html` file in any modern browser. All data is stored locally in your browser, so there is nothing to deploy or configure.

### Saving meetings to GitHub

1. In the **GitHub sync** card, enter the owner/org, repo, branch, folder, and filename where you want the JSON stored. (Folders are created automatically.)
2. Paste a GitHub personal access token (classic or fine-grained) with `repo` scope if the repository is private. For public repos you can leave the token blank.
3. Click **Save settings** and then **Sync to GitHub** to push the current `meetings.json` file. Use **Pull from GitHub** on a new machine to hydrate the app with that file, or enable the auto-sync toggle so pushes happen after every meeting change.

Tokens are saved only in your browser's localStorage and are never transmitted anywhere except directly to GitHub's API.
