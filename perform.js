
let { Octokit } = require('@octokit/rest')
let fetchArticle = require('./src/fetchArticle')
let renderToMarkdown = require('./src/renderToMarkdown')

require('dotenv').config()

let TOKEN = process.env.TOKEN
let REPOSITORY = process.env.REPOSITORY
let [OWNER, REPO] = REPOSITORY.split('/')

let octokit = new Octokit({
  auth: TOKEN
})

async function performTasks() {
  let { data } = await octokit.issues.listForRepo({
    owner: OWNER,
    repo: REPO,
    state: 'open'
  })

  let promises = data.map(async (issue) => {
    try {
      let articleData = await fetchArticle(issue.body || issue.title)
      await octokit.issues.createComment({
        owner: OWNER,
        repo: REPO,
        issue_number: issue.number,
        body: renderToMarkdown(articleData)
      })
      await octokit.issues.update({
        owner: OWNER,
        repo: REPO,
        issue_number: issue.number,
        state: 'closed',
        title: articleData.title,
        labels: ['fetched']
      })
    } catch(error) {
      await octokit.issues.createComment({
        owner: OWNER,
        repo: REPO,
        issue_number: issue.number,
        body: `错误 ${error.toString()}`
      })
      await octokit.issues.update({
        owner: OWNER,
        repo: REPO,
        issue_number: issue.number,
        state: 'closed',
        labels: ['error']
      })
      throw error
    }
  })

  await Promise.all(promises)
}

performTasks()