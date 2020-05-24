import * as core from '@actions/core'
import * as github from '@actions/github'

async function run(): Promise<void> {
  try {
    const token = core.getInput('repo-token', {required: true})
    const context = github.context
    const client = new github.GitHub(token)
    const issue = await getIssue(client)
    core.debug(`Issue: ${JSON.stringify(issue)}`)
    const projects = issue.projectCards.nodes.map(node => node.project.name)
    if (projects.length === 0) {
      core.info('There is no projects for issue')
      return Promise.resolve()
    }
    const {nodes: currentLabels} = issue.labels
    core.info(`Current labels: ${currentLabels}`)
    const requiredlabels = ['good first issue']
    core.info(`Required labels: ${requiredlabels}`)
    const labels = requiredlabels.filter(
      label => !currentLabels.includes(label)
    )
    core.info(`Adding labels: ${labels}`)
    if (labels.length === 0) {
      core.info('There is no labels to add')
      return Promise.resolve()
    }
    await client.issues.addLabels({
      issue_number: context.issue.number,
      labels,
      owner: context.repo.owner,
      repo: context.repo.repo
    })
  } catch (error) {
    core.setFailed(error.message)
  }
}

interface Project {
  name: string
}
interface Issue {
  projectCards: {
    nodes: {project: Project}[]
  }
  labels: {
    nodes: string[]
  }
}

interface IssueResponse {
  repository: {
    issue: Issue
  }
}

const getIssue = async (client: github.GitHub): Promise<Issue> => {
  const params = {
    owner: github.context.repo.owner,
    repo: github.context.repo.repo,
    issueNumber: github.context.issue.number
  }
  core.debug(`Issue request params: ${JSON.stringify(params)}`)
  const response = await client.graphql<IssueResponse>(
    `
       query issue($owner: String!, $repo: String!, $issueNumber: Int!) {
          repository(owner: $owner, name: $repo) {
            issue(number: $issueNumber) {
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
    params
  )
  return response.repository.issue
}

run()
