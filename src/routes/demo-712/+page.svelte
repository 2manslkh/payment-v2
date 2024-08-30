<script lang="ts">
	import { onMount } from 'svelte';
	import { createPublicClient, http, parseEther, getContract } from 'viem';
	import { base } from 'viem/chains';
	import { execHaloCmdWeb } from '@arx-research/libhalo/api/web';
	import type { PermitData, NfcResult, SignedResult } from './types';
	import type { StatusCallbackDetails } from '@arx-research/libhalo/types';

	// Add this polyfill at the top of your script
	if (typeof global === 'undefined') {
		(window as any).global = window;
	}

	// Constants
	const amount = '1';
	const recipientAddress = '0x985A29E88E75394DbDaE41a269409f701ccf6a43';
	const tokenAddress = '0xF2C0b56Ef803490E5cbd0b87e2e9602F0143c534';
	const relayerAddress = '0x29624D55b4Dd1fdCea1675cD16F26092Dbe32a57';
	const baseRpcUrl = 'https://sepolia.base.org';
	const chainId = 84532;

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
	function updateStatus(status: string, execMethod: StatusCallbackDetails) {
		console.log(status, execMethod);
		const messages: { [key: string]: string } = {
			init: 'Please tap your Halo card to the back of your smartphone.',
			again: 'Processing (1/2)..',
			retry: 'There was an error. Please try tapping your card again.',
			finished: 'Processing (1/2)...'
		};
		showStatus(messages[status] || `${status}, ${execMethod}`);
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
			const client = createPublicClient({
				chain: base,
				transport: http(baseRpcUrl)
			});

			const token = getContract({
				address: tokenAddress,
				abi: [
					{
						inputs: [],
						name: 'name',
						outputs: [{ type: 'string' }],
						stateMutability: 'view',
						type: 'function'
					},
					{
						inputs: [{ type: 'address' }],
						name: 'nonces',
						outputs: [{ type: 'uint256' }],
						stateMutability: 'view',
						type: 'function'
					}
				],
				client: client
			});

			const nfcResult = await execHaloCmdWeb(
				{ name: 'get_pkeys' },
				{ statusCallback: updateStatus }
			);

			const userAddress = nfcResult.etherAddresses['1'] as `0x${string}`;
			const userNonce = await token.read.nonces([userAddress]);

			// Construct permit data
			const permitData: PermitData = {
				domain: {
					name: await token.read.name(),
					version: '1',
					chainId: chainId,
					verifyingContract: tokenAddress
				},
				types: {
					Permit: [
						{ name: 'owner', type: 'address' },
						{ name: 'spender', type: 'address' },
						{ name: 'value', type: 'uint256' },
						{ name: 'nonce', type: 'uint256' },
						{ name: 'deadline', type: 'uint256' }
					]
				},
				value: {
					owner: userAddress,
					spender: relayerAddress,
					value: parseEther(amount).toString(),
					nonce: userNonce.toString(),
					deadline: Math.floor(Date.now() / 1000) + 3600 // 1 hour from now
				}
			};

			// Sign the typed data
			const signedResult: SignedResult = await execHaloCmdWeb(
				{
					name: 'sign',
					keyNo: 1,
					typedData: permitData
				},
				{ statusCallback: updateStatusPhase2 }
			);

			const signature = signedResult.signature;

			showStatus('Permit signed successfully! Sending to relay...');
			console.log('Permit signature:', signature);

			// Send the permit to the relay endpoint
			const response = await fetch('/api/relay', {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json'
				},
				body: JSON.stringify({
					permitData,
					signature,
					receiver: recipientAddress
				})
			});

			const result = await response.json();

			if (result.success) {
				showStatus('Payment Successful!');
				showLink(result.transferTxHash);
			} else {
				throw new Error(result.error || 'Relay request failed');
			}
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
	<title>Pay in Coins</title>
</svelte:head>

<div class="card">
	<h1>EasyPay on Base</h1>
	<div class="amount">{amount} Coin</div>
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
