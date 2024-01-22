import * as core from "@actions/core"
import { Context } from "@actions/github/lib/context"

const REQUESTED_COMMENTS_PER_PAGE = 20

/**
 * @typedef {import('@octokit/plugin-rest-endpoint-methods/dist-types/generated/method-types').RestEndpointMethods} GithubRest
 * @typedef {Awaited<ReturnType<GithubRest['issues']['listComments']>>} ListCommentsResponse
 */

/**
 * Deletes old comments that exists.
 * @param {GithubRest} github
 * @param {*} options
 * @param {Context} context
 * @param {boolean} keepLast
 */
export async function deleteOldComments(github, options, context, keepLast) {
	const existingComments = await getExistingComments(github, options, context)
	const commentToUpdate = keepLast ? null : existingComments.shift()
	for (const comment of existingComments) {
		core.debug(`Deleting comment: ${comment.id}`)
		try {
			await github.issues.deleteComment({
				owner: context.repo.owner,
				repo: context.repo.repo,
				comment_id: comment.id,
			})
		} catch (error) {
			console.error(error)
		}
	}

	return commentToUpdate
}

/**
 * Gets all existing comments.
 * @param {GithubRest} github
 * @param {*} options
 * @param {Context} context
 * @returns
 */
export async function getExistingComments(github, options, context) {
	let page = 0

	/** @type {ListCommentsResponse['data']} */
	let results = []

	/** @type {ListCommentsResponse} */
	let response
	do {
		response = await github.issues.listComments({
			issue_number: context.issue.number,
			owner: context.repo.owner,
			repo: context.repo.repo,
			per_page: REQUESTED_COMMENTS_PER_PAGE,
			page: page,
			sort: "updated",
			direction: 'desc',
		})
		results = results.concat(response.data)
		page++
	} while (response.data.length === REQUESTED_COMMENTS_PER_PAGE)

	return results.filter(
		comment =>
			!!comment.user &&
			(!options.title || comment.body.includes(options.title)) &&
			comment.body.includes("Coverage Report"),
	)
}
