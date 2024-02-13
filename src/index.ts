import {
	Connection,
	Keypair,
} from '@solana/web3.js';
import { initializeKeypair } from './keypair-helpers';
require('dotenv').config();


async function main() {
	const connection = new Connection('http://127.0.0.1:8899', 'confirmed');
	// - Generate keys
	const payer = await initializeKeypair(connection);

	const mintKeypair = Keypair.generate();
	const mint = mintKeypair.publicKey;
	const mintDecimals = 9;

	const tokenAccountKeypair = Keypair.generate();
	const tokenAccount = tokenAccountKeypair.publicKey;

	console.log("Payer Account Public Key: ", payer.publicKey);
	console.log("Mint Public Key: ", mint);
	console.log("Token Account Public Key: ", tokenAccount);

	// - Create Mint Account
	// - Create Token Account

	// - Tests
	// - Minting without thawing
	// - Thawing and minting
	// - Trying to transfer ownership
	// - Trying to transfer without a memo
	// - Transferring with memo with a frozen account
	// - Transferring with memo with a thawed account
}

main();