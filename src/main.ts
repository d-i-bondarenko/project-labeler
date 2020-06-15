import * as core from '@actions/core'
import * as github from '@actions/github'
import {ReposGetContentsResponseData} from '@octokit/types'
import {safeLoad} from 'js-yaml'

async function run(): Promise<void> {
  try {
    const token = core.getInput('repo-token', {required: true})
    const context = github.context
    const client = new github.GitHub(token)
    const issue = await getIssue(client)
    core.debug(`Issue: ${JSON.stringify(issue)}`)
    const issueProjects = issue.projectCards.nodes.map(
      node => node.project.name
    )
    if (issueProjects.length === 0) {
      core.info('There is no projects for issue')
      return Promise.resolve()
    }
    const currentLabels = issue.labels.nodes.map(node => node.name)
    core.info(`Current labels: ${currentLabels}`)
    const configurationPath = core.getInput('configuration-path', {
      required: true
    })
    const {projects} = await getProjectsConfiguration(client, configurationPath)
    let requiredLabels: string[] = []
    for (const project of projects) {
      if (
        !issueProjects.some(issueProject => issueProject.match(project.match))
      )
        continue
      core.startGroup(`Matches project pattern: ${project.match}`)
      for (const [index, labelsRule] of project.labels.entries()) {
        core.info(`Inspecting rule #${index + 1}`)
        if (
          labelsRule.whitelist?.some(label => !currentLabels.includes(label))
        ) {
          core.info(
            `Issue does not have one of rule's whitelist labels: ${labelsRule.whitelist}`
          )
          continue
        }
        if (
          currentLabels.some(label => labelsRule.blacklist?.includes(label))
        ) {
          core.info(
            `Issue has one of rule's blacklist labels: ${labelsRule.blacklist}`
          )
          continue
        }
        core.info(`Labels required by rule: ${labelsRule.required}`)
        requiredLabels = [...requiredLabels, ...labelsRule.required]
      }
      core.endGroup()
    }
    core.info(`Required labels: ${requiredLabels}`)
    const addingLabels = requiredLabels.filter(
      label => !currentLabels.includes(label)
    )
    core.info(`Adding labels: ${addingLabels}`)
    if (addingLabels.length === 0) {
      core.info('There is no labels to add')
      return Promise.resolve()
    }
    await client.issues.addLabels({
      issue_number: context.issue.number,
      labels: addingLabels,
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
    nodes: {name: string}[]
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

const getProjectsConfiguration = async (
  client: github.GitHub,
  configurationPath: string
): Promise<ProjectsConfiguration> => {
  const configurationContent = await fetchContent(client, configurationPath)
  return safeLoad(configurationContent) as ProjectsConfiguration
}

interface ProjectsConfiguration {
  projects: ProjectLabels[]
}

interface ProjectLabels {
  match: string
  labels: LabelsRule[]
}

interface LabelsRule {
  required: string[]
  blacklist?: string[]
  whitelist?: string[]
}

const fetchContent = async (
  client: github.GitHub,
  contentPath: string
): Promise<string> => {
  const params = {
    owner: github.context.repo.owner,
    repo: github.context.repo.repo,
    ref: github.context.sha,
    path: contentPath
  }
  core.debug(`Content request params: ${JSON.stringify(params)}`)
  const response = await client.repos.getContents(params)
  const {content, encoding} = response.data as ReposGetContentsResponseData
  return Buffer.from(content, encoding as BufferEncoding).toString()
}

run()
