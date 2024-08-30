<script lang="ts">
	import { onMount } from 'svelte';
	import {
		createPublicClient,
		http,
		parseEther,
		serializeTransaction,
		keccak256,
		createWalletClient,
		type TransactionSerializable,
		type Signature
	} from 'viem';
	import { base } from 'viem/chains';
	import { execHaloCmdWeb } from '@arx-research/libhalo/api/web';
	import type { StatusCallbackDetails } from '@arx-research/libhalo/types';

	// Constants
	const amount = '0.00001';
	const recipientAddress = '0x985A29E88E75394DbDaE41a269409f701ccf6a43';
	const baseRpcUrl = 'https://sepolia.base.org';

	// Create Viem client
	const publicClient = createPublicClient({
		chain: base,
		transport: http(baseRpcUrl)
	});

	// Reactive variables
	let status = '';
	let txLink = '';

	// Function to show status
	function showStatus(message: string) {
		status = message;
		// You can add logic here to remove the status after a certain time if needed
	}

	// Function to show transaction link
	function showLink(txHash: string) {
		txLink = `https://sepolia.basescan.org/tx/${txHash}`;
	}

	// Status update functions
	function updateStatus(cause: string, execMethod: string) {
		console.log(cause, execMethod);
		const messages: { [key: string]: string } = {
			init: 'Please tap your Halo card to the back of your smartphone.',
			again: 'Processing (1/2)..',
			retry: 'There was an error. Please try tapping your card again.',
			finished: 'Processing (1/2)...'
		};
		showStatus(messages[cause] || `${cause}, ${execMethod}`);
	}

	function updateStatusPhase2(status: string, execMethod: StatusCallbackDetails) {
		console.log(status, execMethod);
		const messages: { [key: string]: string } = {
			init: 'Processing (2/2).',
			again: 'Processing (2/2)..',
			retry: 'There was an error. Please try tapping your card again.',
			finished: 'Processing (2/2)...'
		};
		showStatus(messages[status] || `${status}, ${execMethod}`);
	}

	// Main payment function
	async function handlePayment() {
		try {
			const nfcResult = await execHaloCmdWeb('get_pkeys', { statusCallback: updateStatusPhase2 });

			const [nonce, gasPrice] = await Promise.all([
				publicClient.getTransactionCount({ address: nfcResult.etherAddresses['1'] }),
				publicClient.getGasPrice()
			]);

			const transaction: TransactionSerializable = {
				to: recipientAddress,
				value: parseEther(amount),
				nonce,
				gas: 21000n,
				gasPrice,
				chainId: base.id
			};

			const serializedTx = serializeTransaction(transaction);
			const digest = keccak256(serializedTx).slice(2);

			const signedTxResult = await execHaloCmdWeb(
				{ name: 'sign', digest, keyNo: 1 },
				{ statusCallback: updateStatusPhase2 }
			);

			const signature: Signature = {
				r: `0x${signedTxResult.signature.raw.r}`,
				s: `0x${signedTxResult.signature.raw.s}`,
				v: BigInt(signedTxResult.signature.raw.v)
			};

			const walletClient = createWalletClient({
				chain: base,
				transport: http(baseRpcUrl)
			});

			const hash = await walletClient.sendRawTransaction({
				serializedTransaction: serializeTransaction(transaction, signature)
			});

			showStatus('Confirming on blockchain...');
			await publicClient.waitForTransactionReceipt({ hash });
			showStatus('Payment Successful!');
			showLink(hash);
		} catch (error) {
			console.error('Payment failed:', error);
			showStatus(`Payment Failed: ${error.message}`);
		}
	}

	onMount(() => {
		// Any initialization code can go here
	});
</script>

<svelte:head>
	<title>Pay in ETH</title>
	<script src="https://unpkg.com/viem"></script>
	<script
		src="https://github.com/arx-research/libhalo/releases/download/libhalo-v1.6.1/libhalo.js"
	></script>
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

<div class="card">
	<h1>EasyPay on Base</h1>
	<div class="amount">{amount} ETH</div>
	<div class="nfc-icon-container">
		<img
			src="https://cdn.glitch.global/930e9978-aa5a-416c-ad20-c8a911951ac5/nfc_pay.svg?v=1723971332336"
			alt="NFC Payment"
			class="nfc-icon"
			id="nfcIcon"
		/>
	</div>
	<button on:click={handlePayment} class="button">Pay</button>
	<div class="status" class:active={status !== ''}>{status}</div>
	{#if txLink}
		<a href={txLink} target="_blank" rel="noopener noreferrer">View transaction</a>
	{/if}
</div>
