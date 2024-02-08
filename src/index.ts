import {
  TOKEN_2022_PROGRAM_ID,
  getAccount,
  AccountState,
  thawAccount,
  mintTo,
  setAuthority,
  AuthorityType,
  createTransferInstruction,
} from "@solana/spl-token";
import {
  sendAndConfirmTransaction,
  Connection,
  Keypair,
  Transaction,
  PublicKey,
  TransactionInstruction,
  SystemProgram,
} from "@solana/web3.js";
import { initializeKeypair } from "./keypair-helpers";
import { createToken22MintWithDefaultState } from "./mint-helpers";
import { createTokenAccountWithExtensions } from "./token-helpers";
require("dotenv").config();

// -------------- TESTS -------------- //

interface MintWithoutThawingInputs {
  connection: Connection;
  payer: Keypair;
  tokenAccount: PublicKey;
  mint: PublicKey;
  amount: number;
}

async function testMintWithoutThawing(inputs:
	MintWithoutThawingInputs) {
	const { connection, payer, tokenAccount, mint, amount } = inputs;
  try {
    // Attempt to mint without thawing
    await mintTo(
      connection,
      payer,
      mint,
      tokenAccount,
      payer.publicKey,
      amount,
      undefined,
      undefined,
      TOKEN_2022_PROGRAM_ID
    );

    console.error("Should not have minted...");
  } catch (error) {
    console.log(
      "✅ - We expected this to fail because the account is still frozen."
    );
  }
}


interface ThawAndMintInputs {
  connection: Connection;
  payer: Keypair;
  tokenAccount: PublicKey;
  mint: PublicKey;
  amount: number;
}
async function testThawAndMint(inputs: ThawAndMintInputs) {
	  const { connection, payer, tokenAccount, mint, amount } = inputs;
	try {
	  // Unfreeze frozen token
	  await thawAccount(
		connection,
		payer,
		tokenAccount,
		mint,
		payer,
		undefined,
		undefined,
		TOKEN_2022_PROGRAM_ID
	  );
  
	  await mintTo(
		  connection,
		  payer,
		  mint,
		  tokenAccount,
		  payer.publicKey,
		  amount,
		  undefined,
		  undefined,
		  TOKEN_2022_PROGRAM_ID
		);
	  
	  const account = await getAccount(connection, tokenAccount, undefined, TOKEN_2022_PROGRAM_ID);

	  console.log(
		`✅ - The new account balance is ${Number(account.amount)} after thawing and minting.`
	  );
	  
	} catch (error) {
	  console.error("Error thawing and or minting token: ", error);
	}
  }


  interface TransferOwnerInputs {
	connection: Connection;
	tokenAccount: PublicKey;
	payer: Keypair;
	newAuthority: PublicKey;
  }
  async function testTryingToTransferOwner(inputs: TransferOwnerInputs) {
	const { connection, payer, tokenAccount, newAuthority } = inputs;
	try {
	  // Attempt to change owner
	  await setAuthority(
		connection,
		payer,
		tokenAccount,
		payer.publicKey,
		AuthorityType.AccountOwner,
		newAuthority,
		undefined,
		undefined,
		TOKEN_2022_PROGRAM_ID
	  );

    console.error("You should not be able to change the owner of the account.");

	} catch (error) {
		console.log(
			`✅ - We expected this to fail because the account is immutable, and cannot change owner.`
		  );
	}
  }


interface TransferWithoutMemoInputs {
	connection: Connection;
	fromTokenAccount: PublicKey;
	destinationTokenAccount: PublicKey;
	payer: Keypair;
	amount: number;	
}
async function testTryingToTransferWithoutMemo(inputs: TransferWithoutMemoInputs) {
	const { fromTokenAccount, destinationTokenAccount, payer, connection, amount } = inputs;
	try {
		const transaction = new Transaction().add(
			createTransferInstruction(
			fromTokenAccount,
			destinationTokenAccount,
			payer.publicKey,
			amount,
			undefined,
			TOKEN_2022_PROGRAM_ID
		  )
		);
	
		await sendAndConfirmTransaction(connection, transaction, [payer]);

		console.error("You should not be able to transfer without a memo.");

	  } catch (error) {
		console.log(
			`✅ - We expected this to fail because you need to send a memo with the transfer.`
		  );
	  }
}

interface TransferWithMemoWithFrozenAccountInputs {
	connection: Connection;
	fromTokenAccount: PublicKey;
	destinationTokenAccount: PublicKey;
	payer: Keypair;
	amount: number;
	message: string;
}
async function testTransferringWithMemoWithFrozenAccount(inputs: TransferWithMemoWithFrozenAccountInputs) {
	const { fromTokenAccount, destinationTokenAccount, payer, connection, amount, message } = inputs;
	try {
		const transaction = new Transaction().add(
			new TransactionInstruction({
				keys: [{ pubkey: payer.publicKey, isSigner: true, isWritable: true }],
				data: Buffer.from(message, "utf-8"),
				programId: new PublicKey("MemoSq4gqABAXKb96qnH8TysNcWxMyWCqXgDLGmfcHr"),
			  }),
			  createTransferInstruction(
				fromTokenAccount,
				destinationTokenAccount,
				payer.publicKey,
				amount,
				undefined,
				TOKEN_2022_PROGRAM_ID
			  )
		);
		await sendAndConfirmTransaction(connection, transaction, [payer]);

		console.error("This should not work until we thaw the account.");

	  } catch (error) {
		console.log(
			`✅ - We expected this to fail because the account is still frozen.`
		  );
	  }

}

interface TransferWithMemoWithThawedAccountInputs {
	connection: Connection;
	fromTokenAccount: PublicKey;
	destinationTokenAccount: PublicKey;
	mint: PublicKey;
	payer: Keypair;
	owner: Keypair;
	amount: number;
	message: string;
}
async function testTransferringWithMemoWithThawedAccount(inputs: TransferWithMemoWithThawedAccountInputs) {
	const { fromTokenAccount, destinationTokenAccount, mint, payer, owner, connection, amount, message } = inputs;
	try {

		// First have to thaw the account
		console.log(owner.publicKey)
		console.log(mint)
		const account = await getAccount(
			connection,
			destinationTokenAccount,
			undefined,
			TOKEN_2022_PROGRAM_ID
		)

		console.log(account)

		// First have to thaw the account from the owner
		await thawAccount(
			connection,
			payer,
			destinationTokenAccount,
			mint,
			owner,
			undefined,
			undefined,
			TOKEN_2022_PROGRAM_ID
		  );

		// Now we can transfer
		const transaction = new Transaction().add(
			new TransactionInstruction({
				keys: [{ pubkey: payer.publicKey, isSigner: true, isWritable: true }],
				data: Buffer.from(message, "utf-8"),
				programId: new PublicKey("MemoSq4gqABAXKb96qnH8TysNcWxMyWCqXgDLGmfcHr"),
			  }),
			  createTransferInstruction(
				fromTokenAccount,
				destinationTokenAccount,
				payer.publicKey,
				amount,
				undefined,
				TOKEN_2022_PROGRAM_ID
			  )
		);
		await sendAndConfirmTransaction(connection, transaction, [payer]);

		// const account = await getAccount(
		// 	connection,
		// 	destinationTokenAccount,
		// 	undefined,
		// 	TOKEN_2022_PROGRAM_ID
		// )


		console.log(
			`✅ - We have transferred ${amount} tokens to ${destinationTokenAccount} with the memo: ${message}`
		  );


	  } catch (error) {
		console.log(error)
		console.error(`This should work. ${error}`);
	  }

}
	

// -------------- MAIN SCRIPT -------------- //

async function main() {
  /// SECTION 0 Setup
  const connection = new Connection("http://127.0.0.1:8899", "confirmed");
  // const connection = new Connection(clusterApiUrl('devnet'), 'confirmed');
  const payer = await initializeKeypair(connection);

  const otherPayer = Keypair.generate();
  const airdropSignature = await connection.requestAirdrop(otherPayer.publicKey, 1000000000);
  connection.confirmTransaction(airdropSignature, 'finalized');

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

  /// SECTION 1 Create Mint and Token Account
  const createMintSignature = await createToken22MintWithDefaultState(
    connection,
    payer,
    mintKeypair,
    mintDecimals,
    defaultAccountState
  );

  const createOurTokenAccountSignature = await createTokenAccountWithExtensions(
    connection,
    mint,
    payer,
    ourTokenAccountKeypair
  );

  const createOtherTokenAccountSignature = await createTokenAccountWithExtensions(
    connection,
    mint,
	otherPayer,
    otherTokenAccountKeypair
  );

  /// SECTION 2 Show how each extension functions by negative cases
  {
    // Show you can't mint without unfreezing
    await testMintWithoutThawing({
		connection,
		payer,
		tokenAccount: ourTokenAccount,
		mint,
		amount: amountToMint
	});
  }

  {
    // Show how to thaw and mint
    await testThawAndMint({
		connection,
		payer,
		tokenAccount: ourTokenAccount,
		mint,
		amount: amountToMint
	});
  }

  {
    // Show that you can't change owner
    await testTryingToTransferOwner({
		connection,
		payer,
		tokenAccount: ourTokenAccount,
		newAuthority: otherPayer.publicKey,
	});
  }

  {
    // Show that you can't transfer without memo
    await testTryingToTransferWithoutMemo({
		connection,
		fromTokenAccount: ourTokenAccount,
		destinationTokenAccount: otherTokenAccount,
		payer,
		amount: amountToTransfer
	});
  }

  {
    // Show transfer with memo 
    await testTransferringWithMemoWithFrozenAccount({
		connection,
		fromTokenAccount: ourTokenAccount,
		destinationTokenAccount: otherTokenAccount,
		payer,
		amount: amountToTransfer,
		message: "Hello, Solana"
	});
  }

  {

	try {

		await thawAccount(
			connection,
			otherPayer,
			otherTokenAccount,
			mint,
			otherPayer,
			undefined,
			undefined,
			TOKEN_2022_PROGRAM_ID
		)
	} catch (error) {
		console.log(error)
	}



    // Show transfer with memo 
    // await testTransferringWithMemoWithThawedAccount({
	// 	connection,
	// 	fromTokenAccount: ourTokenAccount,
	// 	destinationTokenAccount: otherTokenAccount,
	// 	mint,
	// 	payer,
	// 	owner: otherTokenHolderKeypair,
	// 	amount: amountToTransfer,
	// 	message: "Hello, Solana"
	// });
  }
}

main();
