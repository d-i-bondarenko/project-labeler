# Project Labeler

Add labels to issue based on projects it belongs to.

## Usage

### Step 1. Create `.github/project-labeler.yml`

Add `.github/project-labeler.yml` with labels settings for each project.

#### Example

```yml
projects:
  - match: ROADMAP.* # RegExp for project name
    labels: # List of label's rules
      - required: ["Size: M"] # Labels that should be on issues from matching projects
        blacklist: ["Bug"] # If issue has any of blacklist-labels it is ignored by action
      - required: ["Size: S"]
        whitelist: ["Bug"] # Only issues with all whitelist labels are going to be processed
        blacklist: ["Won't fix"] # In this case label "Size: S" will be added only on issues with "Bug" label and without "Won't fix"
  - match: TECHDEBT.*
    labels:
      - required: ["Area: Infrastructure"]
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
        uses: d-i-bondarenko/project-labeler@v0.2.0
        with:
          repo-token: "${{ secrets.GITHUB_TOKEN }}"
```
