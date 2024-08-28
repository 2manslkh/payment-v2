<script lang="ts">
	import { onMount } from 'svelte';
	import { ethers } from 'ethers';

	let currentAmount = '0.000000';
	let showCalculator = true;
	let showPayment = false;
	let paymentStatus = '';
	let paymentLinkHref = '';
	let nfcIconPulsating = false;
	let recipientAddress: string;

	const ETH_USD_RATE = 2500;
	const baseRpcUrl = 'https://sepolia.base.org';
	const chainId = 84532;

	$: usdValue = (parseFloat(currentAmount) * ETH_USD_RATE).toFixed(2);

	function getRecipientAddress() {
		const urlParams = new URLSearchParams(window.location.search);
		const address = urlParams.get('address');

		if (address && ethers.utils.isAddress(address)) {
			return address;
		} else {
			throw new Error('Invalid or missing Ethereum address');
		}
	}

	function updateAmount(value: string) {
		if (currentAmount === '0.000000') {
			currentAmount = '0.00000' + value;
		} else {
			let [whole, decimal] = currentAmount.split('.');
			if (decimal.length < 6) {
				currentAmount = whole + '.' + (decimal + value).padEnd(6, '0');
			} else {
				currentAmount = (parseFloat(currentAmount) * 10 + parseFloat(value) / 1000000).toFixed(6);
			}
		}
	}

	function clearAmount() {
		currentAmount = '0.000000';
	}

	function backspace() {
		if (currentAmount !== '0.000000') {
			let strippedAmount = currentAmount.replace('.', '').replace(/^0+/, '');
			strippedAmount = strippedAmount.slice(0, -1);
			strippedAmount = strippedAmount.padStart(7, '0');
			currentAmount = strippedAmount.slice(0, -6) + '.' + strippedAmount.slice(-6);
			if (currentAmount.startsWith('.')) {
				currentAmount = '0' + currentAmount;
			}
		}
	}

	function updateStatus(cause: string, execMethod: string) {
		console.log(cause, execMethod);
		const messages: { [key: string]: string } = {
			init: 'Please tap your Halo card to the back of your smartphone.',
			again: 'Processing (1/2)..',
			retry: 'There was an error. Please try tapping your card again.',
			finished: 'Processing (1/2)...'
		};

		paymentStatus = messages[cause] || `${cause}, ${execMethod}`;
	}

	function updateStatusPhase2(cause: string, execMethod: string) {
		console.log(cause, execMethod);
		const messages: { [key: string]: string } = {
			init: 'Processing (2/2).',
			again: 'Processing (2/2)..',
			retry: 'There was an error. Please try tapping your card again.',
			finished: 'Processing (2/2)...'
		};

		paymentStatus = messages[cause] || `${cause}, ${execMethod}`;
	}

	async function handlePayment() {
		showCalculator = false;
		showPayment = true;
		nfcIconPulsating = true;
		paymentStatus = 'Tap here to pay';

		try {
			const provider = new ethers.providers.JsonRpcProvider(baseRpcUrl);

			const nfcResult = await window.execHaloCmdWeb(
				{ name: 'get_pkeys' },
				{ statusCallback: updateStatus }
			);

			const [nonce, gasPrice] = await Promise.all([
				provider.getTransactionCount(nfcResult.etherAddresses['1']),
				provider.getGasPrice()
			]);

			const transaction = {
				to: recipientAddress,
				value: ethers.utils.parseEther(currentAmount),
				nonce,
				gasLimit: 21000,
				gasPrice,
				chainId
			};

			const serializedTx = ethers.utils.serializeTransaction(transaction);
			const digest = ethers.utils.keccak256(serializedTx).slice(2);

			const signedTxResult = await window.execHaloCmdWeb(
				{ name: 'sign', digest, keyNo: 1 },
				{ statusCallback: updateStatusPhase2 }
			);

			const signature = {
				r: '0x' + signedTxResult.signature.raw.r,
				s: '0x' + signedTxResult.signature.raw.s,
				v: signedTxResult.signature.raw.v
			};

			const signedTx = ethers.utils.serializeTransaction(transaction, signature);
			const tx = await provider.sendTransaction(signedTx);
			paymentStatus = 'Confirming on blockchain...';
			await tx.wait();
			paymentStatus = 'Payment Successful!';
			nfcIconPulsating = false;
			paymentLinkHref = `https://sepolia.basescan.org/tx/${tx.hash}`;
		} catch (error) {
			console.error('Payment failed:', error);
			paymentStatus = `Payment Failed: ${error.message}`;
			nfcIconPulsating = false;
		}
	}

	onMount(() => {
		try {
			recipientAddress = getRecipientAddress();
		} catch (error) {
			console.error(error);
			paymentStatus = error.message;
		}
	});
</script>

<svelte:head>
	<title>EasyPay on Base - Merchant Demo</title>
	<script
		src="https://cdn.ethers.io/lib/ethers-5.7.2.umd.min.js"
		type="application/javascript"
	></script>
	<script
		src="https://github.com/arx-research/libhalo/releases/download/libhalo-v1.6.1/libhalo.js"
	></script>
	<link
		href="https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700&display=swap"
		rel="stylesheet"
	/>
	<meta
		name="viewport"
		content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no"
	/>
</svelte:head>

<div class="container">
	<h1>EasyPay on Base</h1>
	{#if showCalculator}
		<div id="calculatorSection">
			<div class="amount-display">
				<div id="amountDisplay">{currentAmount} ETH</div>
				<div class="usd-amount" id="usdAmount">${usdValue} USD</div>
			</div>
			<div class="calculator">
				{#each ['7', '8', '9', '4', '5', '6', '1', '2', '3'] as num}
					<button class="calc-btn" on:click={() => updateAmount(num)}>{num}</button>
				{/each}
				<button class="calc-btn red" on:click={clearAmount}>C</button>
				<button class="calc-btn" on:click={() => updateAmount('0')}>0</button>
				<button class="calc-btn yellow" on:click={backspace}>&larr;</button>
				<button class="calc-btn green wide" on:click={handlePayment}>Charge</button>
			</div>
		</div>
	{/if}
	{#if showPayment}
		<div id="paymentSection">
			<div class="nfc-icon-container">
				<img
					id="nfcIcon"
					class="payment-icon"
					class:pulsating={nfcIconPulsating}
					src="https://cdn.glitch.global/930e9978-aa5a-416c-ad20-c8a911951ac5/nfc_pay.svg?v=1723971332336"
					alt="NFC Payment"
				/>
			</div>
			<div id="paymentStatus" class="payment-status">{paymentStatus}</div>
			{#if paymentLinkHref}
				<a href={paymentLinkHref} target="_blank">View transaction</a>
			{/if}
		</div>
	{/if}
</div>

<style>
	:root {
		--primary-blue: #1652f0;
		--secondary-blue: #0a46e4;
		--light-blue: #e9f0ff;
		--dark-blue: #05195a;
		--white: #ffffff;
		--gray: #f3f3f3;
		--green: #4caf50;
		--yellow: #ffc107;
		--red: #f44336;
	}

	.container {
		background: var(--white);
		border-radius: 20px;
		box-shadow: 0 10px 30px rgba(0, 0, 0, 0.1);
		padding: 40px;
		width: 90%;
		max-width: 400px;
	}
	h1 {
		color: var(--dark-blue);
		text-align: center;
		margin-bottom: 30px;
	}
	.amount-display {
		font-size: 36px;
		font-weight: 700;
		color: var(--primary-blue);
		text-align: right;
		margin-bottom: 20px;
		min-height: 60px;
		padding: 10px;
		background: var(--gray);
		border-radius: 10px;
		word-wrap: break-word;
	}
	.usd-amount {
		font-size: 18px;
		font-style: italic;
		color: var(--dark-blue);
		opacity: 0.7;
		margin-top: 5px;
	}
	.calculator {
		display: grid;
		grid-template-columns: repeat(3, 1fr);
		gap: 10px;
	}
	.calc-btn {
		background: var(--gray);
		border: none;
		border-radius: 10px;
		padding: 20px;
		font-size: 24px;
		font-weight: 600;
		color: var(--dark-blue);
		cursor: pointer;
		transition: all 0.3s ease;
	}
	.calc-btn:hover {
		background: var(--light-blue);
	}
	.calc-btn.green {
		background: var(--green);
		color: var(--white);
	}
	.calc-btn.yellow {
		background: var(--yellow);
		color: var(--white);
	}
	.calc-btn.red {
		background: var(--red);
		color: var(--white);
	}
	.calc-btn.wide {
		grid-column: span 3;
	}
	.nfc-icon-container {
		width: 150px;
		height: 150px;
		margin: 30px auto;
		position: relative;
	}
	.payment-icon {
		width: 100%;
		height: 100%;
		transition: all 0.5s ease;
	}
	@keyframes pulse {
		0% {
			transform: scale(1);
			opacity: 1;
		}
		50% {
			transform: scale(1.1);
			opacity: 0.7;
		}
		100% {
			transform: scale(1);
			opacity: 1;
		}
	}
	.pulsating {
		animation: pulse 1.5s infinite;
	}
	.payment-status {
		text-align: center;
		font-weight: 600;
		color: var(--dark-blue);
		margin-top: 20px;
		min-height: 24px;
	}
</style>
