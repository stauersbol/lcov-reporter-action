import lcov from 'lcov-parse'

/**
 *
 * @param {string} data
 * @returns {Promise<lcov.LcovFile[]>}
 */
export function parse(data) {
	return new Promise(function (resolve, reject) {
		lcov(data, function (err, res) {
			if (err) {
				reject(err)
				return
			}
			resolve(res)
		})
	})
}

/**
 *
 * @param {lcov.LcovFile[]} lcov
 * @returns {number}
 */
export function percentage(lcov) {
	let hit = 0
	let found = 0
	for (const entry of lcov) {
		hit += entry.lines.hit
		found += entry.lines.found
	}

	return (hit / found) * 100
}
