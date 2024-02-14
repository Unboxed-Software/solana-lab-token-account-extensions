import {
	Connection,
	Keypair,
} from '@solana/web3.js';
import { initializeKeypair } from './keypair-helpers';
require('dotenv').config();


async function main() {
	const connection = new Connection(clusterApiUrl('devnet'), 'confirmed');
	const payer = await initializeKeypair(connection);
  
	const otherOwner = Keypair.generate();
  
	const mintKeypair = Keypair.generate();
	const mint = mintKeypair.publicKey;
	const mintDecimals = 9;
	const defaultAccountState = AccountState.Frozen;
  
	const ourTokenAccountKeypair = Keypair.generate();
	const ourTokenAccount = ourTokenAccountKeypair.publicKey;
  
	const otherTokenAccountKeypair = Keypair.generate();
	const otherTokenAccount = otherTokenAccountKeypair.publicKey;
  
	const amountToMint = 1000;
	const amountToTransfer = 300;

	console.log("Payer account public key: ", payer.publicKey);
	console.log("Mint public key: ", mint);
	console.log("Our token account public key: ", ourTokenAccount);
	console.log("Other token account public key: ", otherTokenAccount);

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