<script>
	import welcome from '$lib/images/svelte-welcome.webp';
	import welcome_fallback from '$lib/images/svelte-welcome.png';
	import Counter from '../components/Counter.svelte';
</script>

<!-- <svelte:head>
	<title>Home</title>
	<meta name="description" content="Svelte demo app" />
</svelte:head> -->

<section>
	<h1>
		<span class="welcome">
			<picture>
				<source srcset={welcome} type="image/webp" />
				<img src={welcome_fallback} alt="Welcome" />
			</picture>
		</span>

		to your new<br />SvelteKit app
	</h1>

	<div class="wrapper">
		<div class="navbar" style="flex-direction: column; opacity: 1;">
			<a class="nav-item" id="link-demo" href="/demo">- Pay in ETH</a>
			<a class="nav-item" href="/demo-712">- Gasless Pay in Coins</a>
			<a class="nav-item" href="/onboarding">- Onboarding</a>
			<a class="nav-item" href="/merchant">- Merchant</a>
			<a class="nav-item" href="/scan">- Scan</a>
		</div>
	</div>

	<h2>
		try editing <strong>src/routes/+page.svelte</strong>
	</h2>

	<Counter />
</section>

<style>
	section {
		display: flex;
		flex-direction: column;
		justify-content: center;
		align-items: center;
		flex: 0.6;
	}

	h1 {
		width: 100%;
	}

	.welcome {
		display: block;
		position: relative;
		width: 100%;
		height: 0;
		padding: 0 0 calc(100% * 495 / 2048) 0;
	}

	.welcome img {
		position: absolute;
		width: 100%;
		height: 100%;
		top: 0;
		display: block;
	}
</style>
