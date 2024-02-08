import { ExtensionType, TOKEN_2022_PROGRAM_ID, createEnableCpiGuardInstruction, createEnableRequiredMemoTransfersInstruction, createInitializeAccountInstruction, createInitializeImmutableOwnerInstruction, getAccountLen } from "@solana/spl-token";
import { Connection, Keypair, PublicKey, SystemProgram, Transaction, sendAndConfirmTransaction } from "@solana/web3.js";

export async function createTokenAccountWithExtensions(
    connection: Connection, 
    mint: PublicKey, 
    payer: Keypair, 
    tokenAccountKeypair: Keypair
): Promise<string> {

	const tokenAccount = tokenAccountKeypair.publicKey;
  
	const extensions = [
	  ExtensionType.CpiGuard,
	  ExtensionType.ImmutableOwner,
	  ExtensionType.MemoTransfer
	];
  
	const tokenAccountLen = getAccountLen(extensions);
	const lamports = await connection.getMinimumBalanceForRentExemption(tokenAccountLen);
  
	const createTokenAccountInstruction = SystemProgram.createAccount({
	  fromPubkey: payer.publicKey,
	  newAccountPubkey: tokenAccount,
	  space: tokenAccountLen,
	  lamports,
	  programId: TOKEN_2022_PROGRAM_ID,
	});
  
	const initializeImmutableOwnerInstruction =
	  createInitializeImmutableOwnerInstruction(
		tokenAccount,
		TOKEN_2022_PROGRAM_ID,
	  );
  
	const initializeRequiredMemoTransfersInstruction =
	  createEnableRequiredMemoTransfersInstruction(
		tokenAccount,
		payer.publicKey, // Could be owner too if you want
		undefined,
		TOKEN_2022_PROGRAM_ID,
	  );
  
	const initializeCpiGuard =
	  createEnableCpiGuardInstruction(tokenAccount, payer.publicKey, [], TOKEN_2022_PROGRAM_ID)
  
	const initializeAccountInstruction = createInitializeAccountInstruction(
	  tokenAccount,
	  mint,
	  payer.publicKey,
	  TOKEN_2022_PROGRAM_ID,
	);
  
	const transaction = new Transaction().add(
	  createTokenAccountInstruction,
  
	  initializeImmutableOwnerInstruction, // THIS HAS TO GO FIRST
  
	  initializeAccountInstruction,  
	  initializeRequiredMemoTransfersInstruction,
	  initializeCpiGuard,
	);

    transaction.feePayer = payer.publicKey;
  
	// Send transaction
	return await sendAndConfirmTransaction(
	  connection,
	  transaction,
	  [payer, tokenAccountKeypair],
	);
  }
  