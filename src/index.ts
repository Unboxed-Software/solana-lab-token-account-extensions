import {
	Connection,
	Keypair,
} from '@solana/web3.js';
import { initializeKeypair } from './keypair-helpers';
require('dotenv').config();


async function main() {
	const connection = new Connection('http://127.0.0.1:8899', 'confirmed');
	const payer = await initializeKeypair(connection);

	const mintKeypair = Keypair.generate();
	const mint = mintKeypair.publicKey;
	const mintDecimals = 9;

	const tokenAccountKeypair = Keypair.generate();
	const tokenAccount = tokenAccountKeypair.publicKey;

	console.log("Payer Account Public Key: ", payer.publicKey)
	console.log("Mint Public Key: ", mint)
	console.log("Token Account Public Key: ", tokenAccount)
}

main();