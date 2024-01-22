import { details, summary, b, fragment, table, tbody, tr, th, h2 } from './html'

import { percentage } from './lcov'
import { tabulate } from './tabulate'
import { LcovFile } from 'lcov-parse'

/**
 *
 * @param {LcovFile[]} lcov
 * @param {*} options
 * @returns
 */
export function comment(lcov, options) {
	return fragment(
		options.title ? h2(options.title) : '',
		options.base
			? `Coverage after merging ${b(options.head)} into ${b(
					options.base,
			  )} will be`
			: `Coverage for this commit`,
		table(tbody(tr(th(percentage(lcov).toFixed(2), '%')))),
		'\n\n',
		details(
			summary(
				options.shouldFilterChangedFiles
					? 'Coverage Report for Changed Files'
					: 'Coverage Report',
			),
			tabulate(lcov, options),
		),
	)
}

/**
 *
 * @param {LcovFile[]} lcov
 * @param {LcovFile[]} before
 * @param {*} options
 * @returns
 */
export function diff(lcov, before, options) {
	if (!before) {
		return comment(lcov, options)
	}

	const pbefore = percentage(before)
	const pafter = percentage(lcov)
	const pdiff = pafter - pbefore
	const plus = pdiff > 0 ? '+' : ''
	const arrow = pdiff === 0 ? '' : pdiff < 0 ? '▾' : '▴'

	const thresholdWarning = options.failDropThreshold
		? `Failing due to coverage drop below ${options.failDropThreshold}%`
		: ''

	return fragment(
		options.title ? h2(options.title) : '',
		options.base
			? `Coverage after merging ${b(options.head)} into ${b(
					options.base,
			  )} will be`
			: `Coverage for this commit`,
		table(
			tbody(
				tr(
					th(pafter.toFixed(2), '%'),
					th(arrow, ' ', plus, pdiff.toFixed(2), '%'),
				),
			),
		),
		thresholdWarning ? b(thresholdWarning) : '',
		'\n\n',
		details(
			summary(
				options.shouldFilterChangedFiles
					? 'Coverage Report for Changed Files'
					: 'Coverage Report',
			),
			tabulate(lcov, options),
		),
	)
}
