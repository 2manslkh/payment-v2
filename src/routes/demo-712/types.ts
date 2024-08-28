export interface NfcResult {
	etherAddresses: {
		[key: string]: string;
	};
}

export interface SignedResult {
	signature: string;
}

export interface PermitData {
	domain: {
		name: string;
		version: string;
		chainId: number;
		verifyingContract: string;
	};
	types: {
		Permit: Array<{ name: string; type: string }>;
	};
	value: {
		owner: string;
		spender: string;
		value: string;
		nonce: string;
		deadline: number;
	};
}
