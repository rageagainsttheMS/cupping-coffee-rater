# Instructions for Claude

## Git

- **Never run `git commit`, `git push`, `gh repo create --push`, or merge/close PRs without asking first.** This applies even when a step in GETTING_STARTED.md or BUILD_PLAN.md lists a commit or push.
- When changes are ready, stop and say so. Propose a commit message and wait for the user to approve or edit it. The user wants to write or edit every commit message themselves.
- Leave changes uncommitted in the working tree by default. Staging with `git add` is also left to the user unless they ask.
- Read-only git commands (`status`, `diff`, `log`) are fine.

Note that all markdown files (with exception of this file), are listed in the /markdown folder in this repo. Always stop and read AGENTS.md and Technical Solution Design document before beginning a coding task. Before building any screen UI, refer to the screen designs in Product Design Ideas document.  
