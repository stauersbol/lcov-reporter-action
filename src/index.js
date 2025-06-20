import { promises as fs } from 'fs'
import core from '@actions/core'
import { context, getOctokit } from '@actions/github'
import path from 'path'

import { parse, percentage } from './lcov'
import { diff } from './comment'
import { getChangedFiles } from './get_changes'
import { deleteOldComments, getExistingComments } from './delete_old_comments'
import { normalisePath } from './util'

const MAX_COMMENT_CHARS = 65536

async function main() {
	const token = core.getInput('github-token')
	const githubClient = getOctokit(token).rest
	const workingDir = core.getInput('working-directory') || './'
	const lcovFile = path.join(
		workingDir,
		core.getInput('lcov-file') || './coverage/lcov.info',
	)
	const baseFile = core.getInput('lcov-base')
	const shouldFilterChangedFiles =
		core.getInput('filter-changed-files').toLowerCase() === 'true'
	const shouldDeleteOldComments =
		core.getInput('delete-old-comments').toLowerCase() === 'true'
	const shouldUpdateLastComment =
		core.getInput('update-comment').toLowerCase() === 'true'
	const title = core.getInput('title')
	const failDropThreshold = core.getInput('fail-drop-threshold')

	if (failDropThreshold && isNaN(parseFloat(failDropThreshold))) {
		console.error(
			`Invalid parameter for fail-drop-threshold: '${failDropThreshold}'. Must be a number. Exiting...`,
		)
		return
	}

	const raw = await fs.readFile(lcovFile, 'utf-8').catch((err) => null)
	if (!raw) {
		console.log(`No coverage report found at '${lcovFile}', exiting...`)
		return
	}

	const baseRaw =
		baseFile && (await fs.readFile(baseFile, 'utf-8').catch((err) => null))
	if (baseFile && !baseRaw) {
		console.log(`No coverage report found at '${baseFile}', ignoring...`)
	}

	const options = {
		repository: context.payload.repository.full_name,
		prefix: normalisePath(`${process.env.GITHUB_WORKSPACE}/`),
		workingDir,
	}

	if (context.eventName === 'pull_request') {
		options.commit = context.payload.pull_request.head.sha
		options.baseCommit = context.payload.pull_request.base.sha
		options.head = context.payload.pull_request.head.ref
		options.base = context.payload.pull_request.base.ref
	} else if (context.eventName === 'push') {
		options.commit = context.payload.after
		options.baseCommit = context.payload.before
		options.head = context.ref
	}

	options.shouldFilterChangedFiles = shouldFilterChangedFiles
	options.title = title
	options.failDropThreshold = failDropThreshold

	if (shouldFilterChangedFiles) {
		options.changedFiles = await getChangedFiles(githubClient, options, context)
	}

	const lcov = await parse(raw)
	const baselcov = baseRaw && (await parse(baseRaw))
	const body = diff(lcov, baselcov, options).substring(0, MAX_COMMENT_CHARS)

	let commentToUpdate
	if (shouldDeleteOldComments) {
		await deleteOldComments(
			githubClient,
			options,
			context,
			shouldUpdateLastComment,
		)
	} else if (shouldUpdateLastComment) {
		const existingComment = await getExistingComments(
			githubClient,
			options,
			context,
		)
		commentToUpdate = existingComment.shift()
	}
	if (context.eventName === 'pull_request' && commentToUpdate) {
		await githubClient.issues.updateComment({
			repo: context.repo.repo,
			owner: context.repo.owner,
			issue_number: context.payload.pull_request.number,
			comment_id: commentToUpdate.id,
			body: body,
		})
	} else if (context.eventName === 'pull_request') {
		await githubClient.issues.createComment({
			repo: context.repo.repo,
			owner: context.repo.owner,
			issue_number: context.payload.pull_request.number,
			body: body,
		})
	} else if (context.eventName === 'push') {
		await githubClient.repos.createCommitComment({
			repo: context.repo.repo,
			owner: context.repo.owner,
			commit_sha: options.commit,
			body: body,
		})
	}

	if (failDropThreshold) {
		if (!baselcov) {
			console.warn(
				`No base coverage report provided, cannot check for coverage drop. Skipping this step.`,
			)
		} else {
			const pbefore = percentage(baselcov)
			const pafter = percentage(lcov)
			const pdiff = pafter - pbefore

			if (pdiff < -failDropThreshold) {
				core.setFailed(
					`Coverage drop of ${pdiff.toFixed(
						2,
					)}% is below threshold of ${failDropThreshold}%. Failing...`,
				)
			}
		}
	}
}

main().catch(function (err) {
	console.log(err)
	core.setFailed(err.message)
})
