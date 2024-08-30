import 'dotenv/config';
import { writeFileSync } from 'fs';
import { ENTRYPOINT_ADDRESS_V07, createSmartAccountClient } from 'permissionless';
import {
	signerToSafeSmartAccount,
	type SmartAccount,
	type SmartAccountSigner
} from 'permissionless/accounts';
import {
	createPimlicoBundlerClient,
	createPimlicoPaymasterClient
} from 'permissionless/clients/pimlico';
import { type Hex, createPublicClient, http, parseEther, type WalletClient } from 'viem';
import { generatePrivateKey, privateKeyToAccount } from 'viem/accounts';
import { baseSepolia } from 'viem/chains';
import { walletClientToSmartAccountSigner } from 'permissionless';

const apiKey = process.env.PIMLICO_API_KEY;
if (!apiKey) throw new Error('Missing PIMLICO_API_KEY');
const paymasterUrl = `https://api.pimlico.io/v2/base-sepolia/rpc?apikey=${apiKey}`;
import tokenABI from '../abis/Token.json';
import type { Signer } from 'ethers';

const privateKey =
	(process.env.PRIVATE_KEY as Hex) ??
	(() => {
		const pk = generatePrivateKey();
		writeFileSync('.env', `PRIVATE_KEY=${pk}`);
		return pk;
	})();

export const publicClient = createPublicClient({
	transport: http('https://sepolia.base.org')
});

export const paymasterClient = createPimlicoPaymasterClient({
	transport: http(paymasterUrl),
	entryPoint: ENTRYPOINT_ADDRESS_V07
});

export async function smartAccount(signer: SmartAccountSigner) {
	const account = await signerToSafeSmartAccount(publicClient, {
		signer: signer,
		entryPoint: ENTRYPOINT_ADDRESS_V07, // global entrypoint
		safeVersion: '1.4.1'
	});

	console.log(`Smart account address: https://sepolia.basescan.org/address/${account.address}`);

	const bundlerUrl = `https://api.pimlico.io/v2/base-sepolia/rpc?apikey=${apiKey}`;

	const bundlerClient = createPimlicoBundlerClient({
		transport: http(bundlerUrl),
		entryPoint: ENTRYPOINT_ADDRESS_V07
	});
	const smartAccountClient = createSmartAccountClient({
		account,
		entryPoint: ENTRYPOINT_ADDRESS_V07,
		chain: baseSepolia,
		bundlerTransport: http(bundlerUrl),
		middleware: {
			gasPrice: async () => {
				return (await bundlerClient.getUserOperationGasPrice()).fast;
			},
			sponsorUserOperation: paymasterClient.sponsorUserOperation
		}
	});

	const txHash = await smartAccountClient.sendTransaction({
		to: '0xd8da6bf26964af9d7eed9e03e53415d37aa96045',
		value: 0n,
		data: '0x1234'
	});

	console.log(`User operation included: https://sepolia.basescan.org/tx/${txHash}`);

	const tokenContract = {
		address: tokenABI.address,
		abi: tokenABI.abi
	};

	// Call drip function to send 'receiver' 10 tokens
	const dripTx = await smartAccountClient.writeContract({
		...tokenContract,
		functionName: 'drip',
		args: [smartAccountClient.account.address, parseEther('10')]
	});

	console.log(`Token drip transaction sent. Hash: ${dripTx}`);
	await publicClient.waitForTransactionReceipt({ hash: dripTx });

	// Call transfer function to send 1 token to a receiver address
	const receiverAddress = smartAccountClient.account.address; // Replace with actual receiver address

	const transferTx = await smartAccountClient.writeContract({
		...tokenContract,
		functionName: 'transfer',
		args: [receiverAddress, parseEther('1')]
	});

	console.log(`Token transfer transaction sent. Hash: ${transferTx}`);
	await publicClient.waitForTransactionReceipt({ hash: transferTx });
}
