import commonjs from "@rollup/plugin-commonjs"
import resolve from "@rollup/plugin-node-resolve"
import json from "@rollup/plugin-json"
import externals from "rollup-plugin-node-externals"

export default {
	input: "src/index.js",
	output: {
		file: "dist/main.js",
		format: "cjs",
	},
	treeshake: true,
	plugins: [
		externals({
			builtins: true,
			deps: false,
		}),
		resolve({
			preferBuiltins: true,
			mainFields: [ "main" ],
		}),
		commonjs(),
		json(),
	],
}
