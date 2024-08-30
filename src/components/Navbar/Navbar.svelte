<script lang="ts">
	import { page } from '$app/stores';

	// Remove the activeLink prop as it's no longer needed
	// export let activeLink: string = '';
</script>

<div class="navbar">
	<a class="nav-item" class:active={$page.url.pathname === '/demo'} href="/demo">Demo</a>
	<a class="nav-item" class:active={$page.url.pathname === '/demo-712'} href="/demo-712"
		>Demo EIP712</a
	>
	<a class="nav-item" class:active={$page.url.pathname === '/onboarding'} href="/onboarding"
		>Onboarding</a
	>
</div>

<style>
	.navbar {
		display: flex;
		background-color: #f0f0f0;
		padding: 10px;
	}
	.nav-item {
		color: #333;
		text-decoration: none;
		padding: 5px 10px;
		margin-right: 10px;
		border-radius: 4px;
		transition: background-color 0.3s ease;
	}
	.nav-item:hover {
		background-color: #e0e0e0;
	}
	.active {
		font-weight: bold;
		background-color: #d0d0d0;
	}
</style>
