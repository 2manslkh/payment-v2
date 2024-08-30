import { sveltekit } from '@sveltejs/kit/vite';
import { nodePolyfills } from 'vite-plugin-node-polyfills';
import { defineConfig } from 'vitest/config';
import fs from 'fs';

export default defineConfig({
	plugins: [
		nodePolyfills({
			exclude: ['fs'],
			globals: {
				Buffer: true,
				global: true,
				process: true
			},
			protocolImports: true
		}),
		sveltekit()
	],

	server: {
		https: {
			key: fs.readFileSync('./server.key'),
			cert: fs.readFileSync('./server.crt')
		},
		proxy: {}
	},
	test: {
		include: ['src/**/*.{test,spec}.{js,ts}']
	}
});
