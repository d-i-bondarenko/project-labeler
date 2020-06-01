# Project Labeler

Add labels to issue based on projects it belongs to.

## Usage

### Step 1. Create `.github/project-labeler.yml`

Add `.github/project-labeler.yml` with labels settings for each project.

#### Example

```yml
projects:
  # RegExp for project name
  - match: ROADMAP.*
    labels:
      # Labels that should be on issues from matching projects
      required: ["Size: M"]
      # If issue has any of blacklist-labels it is ignored by action
      blacklist: ["Bug"]
  - match: TECHDEBT.*
    labels:
      required: ["Size: S"]
```

### Step 2. Create Workflow

Common usage of action is on assigned issue event. An example of workflow (eg: `.github/workflows/project-labeler.yml` see [Creating a Workflow file](https://help.github.com/en/articles/configuring-a-workflow#creating-a-workflow-file)):

```yml
name: "Project Labeler"
on:
  issues:
    types:
      - assigned

jobs:
  triage:
    runs-on: ubuntu-latest
    steps:
      - name: Add labels by project
        uses: d-i-bondarenko/project-labeler@master
        with:
          repo-token: "${{ secrets.GITHUB_TOKEN }}"
```
