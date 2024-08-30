import { json } from '@sveltejs/kit';
import { createPublicClient, createWalletClient, http, parseEther, type Address } from 'viem';
import { baseSepolia } from 'viem/chains';
import { privateKeyToAccount } from 'viem/accounts';
import { PRIVATE_RELAYER_PRIVATE_KEY } from '$env/static/private';
import tokenABI from '$lib/abis/Token.json';

/**
 * Faucet endpoint for distributing ETH and tokens on the Base Sepolia network.
 *
 * This endpoint handles POST requests to distribute a small amount of ETH (0.001)
 * and 10 tokens to a specified receiver address.
 *
 * @async
 * @function POST
 * @param {Object} options - The options object.
 * @param {Request} options.request - The incoming request object.
 * @returns {Promise<Response>} A JSON response indicating success or failure.
 *
 * @example
 * // Request body
 * {
 *   "receiver": "0x742d35Cc6634C0532925a3b844Bc454e4438f44e"
 * }
 *
 * // Successful response
 * {
 *   "success": true,
 *   "txHash": "0x...",  // ETH transaction hash
 *   "dripTxHash": "0x..."  // Token transaction hash
 * }
 *
 * // Error response
 * {
 *   "success": false,
 *   "error": "Error message"
 * }
 */
export async function POST({ request }: { request: Request }) {
	console.log('Received faucet request');
	const baseRpcUrl = 'https://sepolia.base.org';

	const { receiver } = (await request.json()) as { receiver: string };
	console.log(`Requested receiver address: ${receiver}`);

	try {
		const publicClient = createPublicClient({
			chain: baseSepolia,
			transport: http(baseRpcUrl)
		});

		const account = privateKeyToAccount(PRIVATE_RELAYER_PRIVATE_KEY as `0x${string}`);
		const walletClient = createWalletClient({
			account,
			chain: baseSepolia,
			transport: http(baseRpcUrl)
		});

		// Get the latest nonce
		const nonce = await publicClient.getTransactionCount({ address: account.address });

		// Send ETH
		const txHash = await walletClient.sendTransaction({
			to: receiver as Address,
			value: parseEther('0.001'),
			nonce: nonce // Use the retrieved nonce
		});

		console.log(`Transaction sent. Hash: ${txHash}`);

		// Call drip function to send 'receiver' 10 tokens
		const { request } = await publicClient.simulateContract({
			address: tokenABI.address as Address,
			abi: tokenABI.abi,
			functionName: 'drip',
			args: [receiver as Address, parseEther('10')]
		});

		const dripTxHash = await walletClient.writeContract({
			...request,
			nonce: nonce + 1 // Increment the nonce for the second transaction
		});
		console.log(`Token drip transaction sent. Hash: ${dripTxHash}`);

		// Wait for transaction confirmation
		await publicClient.waitForTransactionReceipt({ hash: dripTxHash });
		console.log(`Token drip transaction confirmed`);

		return json({ success: true, txHash, dripTxHash });
	} catch (error) {
		console.error('Faucet request failed:', error);
		return json({ success: false, error: (error as Error).message }, { status: 400 });
	}
}
