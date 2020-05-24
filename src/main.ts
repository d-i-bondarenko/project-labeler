import * as core from '@actions/core'
import * as github from '@actions/github'

async function run(): Promise<void> {
  try {
    const token = core.getInput('repo-token', {required: true})
    const context = github.context
    core.debug(`Context: ${JSON.stringify(context)}`)
    const client = new github.GitHub(token)
    const repository = await client.graphql(
      `
       query issue($owner: String!, $repo: String!, $issue: Int!) {
          repository(owner: $owner, name: $repo) {
            issue(number: $issue) {
              projectCards {
                nodes {
                  project {
                    name
                  }
                }
              }
              labels(first: 10) {
                nodes {
                  name
                }
              }
            }
          }
        }
      `,
      {
        owner: context.repo.owner,
        repo: context.repo.repo,
        issue: context.issue.number
      }
    )
    core.debug(`Response: ${JSON.stringify(repository)}`)
    await client.issues.addLabels({
      issue_number: context.issue.number,
      labels: ['good first issue'],
      owner: context.repo.owner,
      repo: context.repo.repo
    })
  } catch (error) {
    core.setFailed(error.message)
  }
}

run()
