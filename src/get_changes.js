import * as core from '@actions/core'
import { Context } from '@actions/github/lib/context'

/**
 * @typedef {import('@octokit/plugin-rest-endpoint-methods/dist-types/generated/method-types').RestEndpointMethods} GithubRest
 */

/**
 *
 * @param {GithubRest} githubClient
 * @param {*} options
 * @param {Context} context
 * @returns
 */
export async function getChangedFiles(githubClient, options, context) {
	if (!options.commit || !options.baseCommit) {
		core.setFailed(
			`The base and head commits are missing from the payload for this ${context.eventName} event.`,
		)
	}
	const response = await githubClient.repos.compareCommits({
		base: options.baseCommit,
		head: options.commit,
		owner: context.repo.owner,
		repo: context.repo.repo,
	})

	if (response.status !== 200) {
		core.setFailed(
			`The GitHub API for comparing the base and head commits for this ${context.eventName} event returned ${response.status}, expected 200.`,
		)
	}

	return response.data.files
		.filter((file) => file.status == 'modified' || file.status == 'added')
		.map((file) => file.filename)
}
