import {
	type Address,
	type Hex,
	type LocalAccount,
	type SignableMessage,
	type TypedData,
	type TypedDataDefinition
} from 'viem';
import { execHaloCmdWeb } from '@arx-research/libhalo/api/web';
import { computeAddress, hexlify, type BytesLike } from 'ethers';
import { hashMessage } from '@ethersproject/hash';
import { _TypedDataEncoder } from '@ethersproject/hash';
import { type TypedDataDomain, type TypedDataField } from '@ethersproject/abstract-signer';

export class HaloSmartAccountSigner implements Omit<LocalAccount, 'signTransaction'> {
	readonly address: Address;
	publicKey: Hex;
	readonly source = 'halo';
	readonly type = 'local';

	constructor(publicKey: Hex) {
		this.publicKey = publicKey;
		this.address = computeAddress(this.publicKey) as Address;
	}

	private async signDigest(digest: BytesLike): Promise<string> {
		let res;

		try {
			res = await execHaloCmdWeb({
				name: 'sign',
				keyNo: 1,
				digest: hexlify(digest).substring(2)
			});
		} catch (e) {
			throw e;
		}

		const signAddr = computeAddress('0x' + res.publicKey);

		if (signAddr !== this.address) {
			throw new Error('This HaLo card is not currently active. Switch HaLo first.');
		}

		return res.signature.ether;
	}

	async signMessage({ message }: { message: SignableMessage }): Promise<Hex> {
		const messageHash = hashMessage(message.toString());
		const signature = await this.signDigest(messageHash);
		return signature as Hex;
	}

	async signTypedData<
		const typedData extends TypedData | Record<string, unknown>,
		primaryType extends keyof typedData | 'EIP712Domain' = keyof typedData
	>(typedDataDefinition: TypedDataDefinition<typedData, primaryType>): Promise<Hex> {
		const { domain, types, message } = typedDataDefinition;
		const signature = await this.signDigest(
			_TypedDataEncoder.hash(
				domain as TypedDataDomain,
				types as Record<string, Array<TypedDataField>>,
				message as Record<string, any>
			)
		);
		return signature as Hex;
	}

	async getAddress(): Promise<Address> {
		return this.address;
	}

	async signTransaction(): Promise<Hex> {
		throw new Error('signTransaction is not implemented for HaloSmartAccountSigner');
	}
}
