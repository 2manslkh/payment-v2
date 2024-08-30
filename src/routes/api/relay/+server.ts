import { json } from '@sveltejs/kit';
import { createPublicClient, createWalletClient, http } from 'viem';
import { baseSepolia } from 'viem/chains';
import { privateKeyToAccount } from 'viem/accounts';
import { PRIVATE_RELAYER_PRIVATE_KEY } from '$env/static/private';
import tokenABI from '$lib/abis/Token.json';
import relayerABI from '$lib/abis/Relayer.json';
import { verifyTypedData } from 'viem';

export async function POST({ request }: { request: Request }) {
	console.log('Received relay request');
	const baseRpcUrl = 'https://sepolia.base.org';

	const { permitData, signature, receiver } = await request.json();

	console.log(`Received permit data:`, permitData);
	console.log(`Received signature:`, signature);
	console.log(`Received receiver address:`, receiver);

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

		console.log('a');

		// Verify the permit signature
		const recoveredAddress = await verifyTypedData({
			address: permitData.value.owner as `0x${string}`,
			domain: permitData.domain,
			types: permitData.types,
			primaryType: 'Permit',
			message: permitData.value,
			signature: signature.ether
		});

		console.log('b');

		if (!recoveredAddress) {
			throw new Error('Invalid signature');
		}

		console.log('Recover signature success');

		// Call the executeTransfer function on the relayer contract
		const { request } = await publicClient.simulateContract({
			address: relayerABI.address as `0x${string}`,
			abi: relayerABI.abi,
			functionName: 'executeTransfer',
			args: [
				permitData.domain.verifyingContract,
				permitData.value.owner,
				receiver,
				BigInt(permitData.value.value),
				BigInt(permitData.value.deadline),
				signature.raw.v,
				`0x${signature.raw.r}`,
				`0x${signature.raw.s}`
			],
			account
		});

		const transferTxHash = await walletClient.writeContract(request);
		console.log(`Permit transaction sent. Hash: ${transferTxHash}`);

		return json({
			success: true,
			transferTxHash
		});
	} catch (error) {
		console.error('Relay request failed:', error);
		return json({ success: false, error: (error as Error).message }, { status: 400 });
	}
}
