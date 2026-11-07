# Git Integration

**Git Integration backs up your Tessello space to a git repository.**

Your Modules and everything they keep live in your Modules folder, the folder you chose in Tessello. If that disk is lost, or when you move to another computer, the folder goes with it. Git Integration keeps a copy of it in a git repository of your own, commit after commit, and tells you how to bring it back.

The work is done by a command, `npx tessello sync`, that you run in your Modules folder: it commits what changed and pushes it to your repository. Git Integration is where you set it up and see how the backup is going.

![Git Integration, with the engine running](images/view.png)

## Contents

- [Getting started](#getting-started)
- [Keep the command running](#keep-the-command-running)
- [What is backed up, and what is not](#what-is-backed-up-and-what-is-not)
- [Secrets and a private repository](#secrets-and-a-private-repository)
- [On the Home: the Widget](#on-the-home-the-widget)
- [Alerts and what to do](#alerts-and-what-to-do)
- [Restore on another computer](#restore-on-another-computer)
- [Your data and the network](#your-data-and-the-network)

## Getting started

You need [git](https://git-scm.com/) and [Node.js](https://nodejs.org/) on your computer, and an empty repository to back up to, such as a **private** repository created on GitHub.

1. Open **Git Integration** from the Launcher, on the left of Tessello.
2. In **Remote repository URL**, enter the address of your repository, such as `git@github.com:you/tessello-backup.git`. It is saved as you type.
3. Open a terminal in your Modules folder and run:

   ```sh
   npx tessello sync
   ```

   The section **Engine** then says **The engine is running.** Until it does, it shows this command: click **Copy** next to it to copy it.
4. Under **Modules whose data is versioned**, tick the Modules whose data you want in the backup. None is ticked at first: see [Secrets and a private repository](#secrets-and-a-private-repository).

The settings:

| Setting | What it does |
|---|---|
| **Remote repository URL** | Where the backup is pushed. When push is on, the command sets it as the `origin` of the folder's repository. |
| **Push to the remote repository** | On by default. Off, the command only commits, and the history stays on this computer. |
| **Frequency (seconds)** | How often the command looks for changes: 60 seconds by default, from 10 to 3600. |

The command creates the git repository of the folder if there is none, on the branch `main`. It never pulls, merges or forces a push: what is on your repository is never overwritten.

## Keep the command running

`npx tessello sync` is the engine of the backup: nothing is backed up while it is not running. It runs in the foreground of its terminal, one round at each interval, and stops with **Ctrl+C**. It does not start by itself when you open your session: start it again each time, or have your system start it for you.

At each round, it reads the settings again, commits what changed, then pushes. It waits when a file has changed in the last 10 seconds, so that it never saves a change half made: that change goes into the next round. Each commit names what it touches, such as `tessello sync: @craftskillz/survival-kit, home`.

Only one `tessello sync` runs on a folder at a time. `npx tessello sync --once` makes a single round, then stops: handy from a scheduled task.

When git has no email set on your computer, the commits are made by **tessello sync** (`sync@tessello.invalid`). With `git config --global user.name` and `user.email` set, they are made in your name.

Git Integration knows the engine runs because the command writes the time of each round. When it has not written for twice the frequency plus 10 seconds, the View says **The engine is stopped: nothing is being backed up.**

## What is backed up, and what is not

Always backed up:

- your **Modules**: the folder of each one, so that they come back as you installed them;
- your **Home**: where your Widgets are;
- the **list of your Modules** (the registry), with the Permissions you accepted;
- the **settings of Git Integration**, so that you find them again after a restore.

Never backed up:

- the **data of the Modules you did not tick**;
- what the command writes for Git Integration to show (its status);
- a **folder that has its own git repository**, such as a Module you develop in place: a repository inside another is a source of trouble. The View lists these folders under **These folders have their own git repository and are not versioned here**;
- files being written by the browser (`*.crswap`), `.DS_Store`, and the command's own temporary files.

When you install a Module later, it appears in the list with **New**, unticked. Untick a Module and its data leaves the repository at the next commit; its files stay on your disk, and the earlier commits keep the version they hold.

These rules are written at each round into your folder's `.gitignore`, between the lines `# >>> tessello sync` and `# <<< tessello sync`. Do not edit that section: the command writes it again. Add your own lines above or below it, they are left as they are.

## Secrets and a private repository

The data of a Module can hold secrets, such as API tokens, and personal notes. Only tick the Modules whose data you are ready to keep in your repository, and use a **private** repository: the View always recommends one.

When your repository is on GitHub and is public, the View warns you, and says how many Modules have their data in it: **Your remote repository is public: anyone can read your backup.** Make it private, or untick the Modules that hold anything personal. A commit already pushed stays in the history of the repository.

Git Integration and `tessello sync` keep no password or token. The push uses the access git already has on your computer: an SSH key or a credential helper. The command never asks for a password: when git cannot authenticate, it shows an alert. Do not put a token in the URL you enter, such as `https://you:token@github.com/…`: the settings of Git Integration are backed up with the rest.

## On the Home: the Widget

Git Integration puts a small Widget on your Home: the state of the backup at a glance, and when the last commit was made.

![The Git Integration Widget on the Home](images/widget.png)

| The Widget says | It means |
|---|---|
| **Up to date** | The engine is running and has no problem. |
| **Alert** | Something needs you: a problem the engine met, or a public repository. |
| **Stopped** | The engine is not running: nothing is being backed up. |

Click the Widget to open Git Integration. With an alert, it opens on the section that explains it.

## Alerts and what to do

While the engine is running, each problem it meets is shown in the section **Engine** of the View, with how long it has lasted; once it stops, the View and the Widget only say it is stopped. Unfold **Message from git** to read what git itself said.

| Alert | What to do |
|---|---|
| **Enter the URL of your remote repository to start backing up.** | The command has no settings to read yet: enter your repository in **Remote repository URL**. |
| **The remote repository has commits this machine does not have.** | Your repository was changed from elsewhere, such as another computer. The command never merges for you, and keeps committing on this computer meanwhile. In a terminal, in your Modules folder: `git pull origin main`, settle any conflict, then `git push -u origin main`. A repository created with a README or a licence is in this case from the first push: create it empty, or add `--allow-unrelated-histories` to the pull. The alert goes away at the next push. |
| **git could not authenticate with the remote repository.** | Check this computer's access to the repository by running `git push -u origin main` in your Modules folder (a plain `git push` only works after a first push has succeeded): add your SSH key, or log in with your credential helper, such as `gh auth setup-git` for GitHub over HTTPS. |
| **The remote repository could not be reached.** | Check its URL and your connection. Some networks block SSH, the `git@github.com:…` addresses: enter the HTTPS address of your repository instead, `https://github.com/you/tessello-backup.git`. The commits go on locally, and the push is tried again at each round. |
| **git is not installed on this machine.** | Install [git](https://git-scm.com/), then run `npx tessello sync` again. |
| **Your remote repository is public** (under **Settings**) | See [Secrets and a private repository](#secrets-and-a-private-repository). |

Run in a folder that is not a Modules folder, the command stops at once and says so in its terminal: run it in the folder you chose in Tessello, or give it that folder, `npx tessello sync <folder>`.

## Restore on another computer

The section **Restore on another machine** of the View gives these commands with your repository already in them: click **Copy** next to each.

1. In a terminal, clone your repository: `git clone <your repository> tessello-backup`.
2. Open Tessello in Chrome or Edge, click **Choose a folder…**, and choose that folder. Your Modules, your Home and your Permissions are back.
3. From the folder that contains it, start the backup again: `npx tessello sync tessello-backup`.

The Modules whose data you did not back up start empty: the View names them under the commands.

## Your data and the network

Git Integration itself contacts no server and asks for no Permission: it only reads and writes its own storage, in your Modules folder. The rest is done by `tessello sync`, on your computer:

- it pushes to the repository you entered, and nowhere else;
- for a repository on `github.com`, it asks GitHub's public API, without any account, whether the repository is public, at most once an hour.

The View and the Widget follow the language (English or French) and the theme of Tessello.

## About Git Integration

Git Integration is a Module of [Tessello](https://github.com/craftskillz/tessello), published by @craftskillz under the MIT license. Its sources, its versions and its issues are at https://github.com/craftskillz/tessello-git-integration.
