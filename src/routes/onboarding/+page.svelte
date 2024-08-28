<script lang="ts">
	import { onMount } from 'svelte';
	import { ethers } from 'ethers';

	let statusMessage: string = '';
	let linkHref: string = '';
	let linkText: string = '';
	let introText: string = 'Welcome to EzPay';
	let showBalanceInfo: boolean = false;
	let showNfcIcon: boolean = false;
	let showStartButton: boolean = true;
	let ethAddress: string = '';
	let ethBalance: string = '';
	let coinBalance: string = '';

	function showStatus(message: string) {
		statusMessage = message;
		// You might want to add logic here to show/hide the status message
	}

	function showLink(txHash: string) {
		linkHref = `https://sepolia.basescan.org/tx/${txHash}`;
		linkText = 'View transaction';
	}

	function updateStatus(cause: string, execMethod: string) {
		console.log(cause, execMethod);
		const messages: { [key: string]: string } = {
			init: ' ',
			again: 'Processing (1/1).',
			retry: 'Processing (1/1)..',
			finished: 'Processing (1/1)...'
		};

		showStatus(messages[cause] || `${cause}, ${execMethod}`);
	}

	async function startOnboarding() {
		try {
			showStatus('Processing faucet request...');

			const nfcResult = await window.execHaloCmdWeb(
				{ name: 'get_pkeys' },
				{ statusCallback: updateStatus }
			);

			const recipientAddress = nfcResult.etherAddresses['1'];

			showStatus('Onboarding...');

			const response = await fetch('/faucet', {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json'
				},
				body: JSON.stringify({ receiver: recipientAddress })
			});

			if (!response.ok) {
				throw new Error('Faucet request failed');
			}
			const { txHash } = await response.json();

			showStatus('Onboarded successfully!');
			showLink(txHash);

			await displayBalance(recipientAddress);
		} catch (error) {
			console.error('Onboarding failed:', error);
			showStatus(`Onboarding Failed: ${error.message}`);
		}
	}

	async function displayBalance(address: string) {
		try {
			const provider = new ethers.providers.JsonRpcProvider('https://sepolia.base.org');
			const balance = await provider.getBalance(address);
			ethBalance = ethers.utils.formatEther(balance);

			const coinContractAddress = '0xF2C0b56Ef803490E5cbd0b87e2e9602F0143c534';
			const coinAbi = ['function balanceOf(address account) view returns (uint256)'];
			const coinContract = new ethers.Contract(coinContractAddress, coinAbi, provider);
			const coinBalanceWei = await coinContract.balanceOf(address);
			coinBalance = ethers.utils.formatEther(coinBalanceWei);

			introText = 'Welcome Back,';
			showNfcIcon = false;
			ethAddress = `${address.slice(0, 6)}...${address.slice(-4)}`;
			showBalanceInfo = true;
		} catch (error) {
			console.error('Failed to fetch balance:', error);
			showStatus('Failed to fetch balance');
		}
	}

	function handleBeginRequest() {
		showStartButton = false;
		introText = 'Tap your NFC Wristband to continue!';
		setTimeout(() => {
			showNfcIcon = true;
			startOnboarding();
		}, 500);
	}

	onMount(() => {
		setTimeout(() => {
			introText = '';
		}, 2000);
	});
</script>

<svelte:head>
	<title>Onboarding</title>
	<script src="https://cdn.ethers.io/lib/ethers-5.7.2.umd.min.js"></script>
	<script
		src="https://github.com/arx-research/libhalo/releases/download/libhalo-v1.6.1/libhalo.js"
	></script>
	<link rel="stylesheet" href="./style.css" />
	<link
		rel="icon"
		href="https://cdn.glitch.global/930e9978-aa5a-416c-ad20-c8a911951ac5/favicon.ico?v=1724130915131"
		type="image/x-icon"
	/>
</svelte:head>

<div class="navbar">
	<a class="nav-item" id="link-demo" href="/demo">Demo</a>
	<a class="nav-item" href="/demo-712">Demo EIP712</a>
</div>

<div class="card" style="height: 300px;">
	<h1>{introText}</h1>
	{#if showBalanceInfo}
		<div class="fade-in">
			<p>{ethAddress}</p>
			<p>{ethBalance}</p>
			<p>{coinBalance}</p>
		</div>
	{/if}
	{#if showNfcIcon}
		<div class="nfc-icon-container fade-in">
			<img
				src="https://cdn.glitch.global/930e9978-aa5a-416c-ad20-c8a911951ac5/nfc_pay.svg?v=1723971332336"
				alt="NFC Payment"
				class="nfc-icon"
			/>
			<!-- Add logic for showing success icon if needed -->
		</div>
	{/if}
	{#if showStartButton}
		<button on:click={handleBeginRequest} class="button">Begin</button>
	{/if}
	<div>{statusMessage}</div>
	{#if linkText}
		<a href={linkHref} target="_blank">{linkText}</a>
	{/if}
</div>

<style>
	@keyframes fadeIn {
		from {
			opacity: 0;
		}
		to {
			opacity: 1;
		}
	}
	.fade-in {
		animation: fadeIn 1s ease-in-out forwards;
	}
</style>
