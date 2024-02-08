import {
	createInitializeMintInstruction,
	getMintLen,
	getMint,
	ExtensionType,
	TOKEN_2022_PROGRAM_ID,
	getAccount,
	createInitializeImmutableOwnerInstruction,
	createInitializeDefaultAccountStateInstruction,
	AccountState,
	createEnableRequiredMemoTransfersInstruction,
	createEnableCpiGuardInstruction,
	createInitializeMintCloseAuthorityInstruction,
	createMint,
	getAccountLen,
	createInitializeAccountInstruction,
	updateDefaultAccountState,
	thawAccount,
	mintTo,
	createAccount,
	createAssociatedTokenAccount,
	setAuthority,
	AuthorityType,
	createTransferInstruction
  } from '@solana/spl-token';
  import {
	clusterApiUrl,
	sendAndConfirmTransaction,
	Connection,
	Keypair,
	SystemProgram,
	Transaction,
	LAMPORTS_PER_SOL,
	PublicKey,
	TransactionInstruction,
  } from '@solana/web3.js';
  import bs58 from 'bs58';
import { initializeKeypair } from './keypair-helpers';
  require('dotenv').config();
  
  async function createToken22MintWithDefaultState(connection: Connection, payer: Keypair, mintKeypair: Keypair, decimals: number = 2): Promise<string> {
	const extensions = [ExtensionType.DefaultAccountState];
	const mintAccount = mintKeypair.publicKey;
  
	const mintAuthority = payer.publicKey;
	const freezeAuthority = payer.publicKey;
  
  
	const mintLen = getMintLen(extensions);
	const lamports = await connection.getMinimumBalanceForRentExemption(mintLen);
  
	const defaultState = AccountState.Frozen;
  
	const createAccountInstruction = SystemProgram.createAccount({
	  fromPubkey: payer.publicKey, // Account that will transfer lamports to created account
	  newAccountPubkey: mintAccount, // Address of the account to create
	  space: mintLen, // Amount of bytes to allocate to the created account
	  lamports, // Amount of lamports transferred to created account
	  programId: TOKEN_2022_PROGRAM_ID, // Program assigned as owner of created account
	});
  
	const initializeMintInstruction = createInitializeMintInstruction(
	  mintAccount,
	  decimals,
	  mintAuthority,
	  freezeAuthority,
	  TOKEN_2022_PROGRAM_ID
	);
  
	// Instruction to initialize the DefaultAccountState Extension
	const initializeDefaultAccountStateInstruction =
	  createInitializeDefaultAccountStateInstruction(
		mintAccount,
		defaultState,
		TOKEN_2022_PROGRAM_ID
	  );
  
	const transaction = new Transaction().add(
	  createAccountInstruction,
	  initializeDefaultAccountStateInstruction,
	  initializeMintInstruction
	);
  
	return await sendAndConfirmTransaction(
	  connection,
	  transaction,
	  [payer, mintKeypair],
	);
  }
  
  async function transferOwner(connection: Connection, payer: Keypair, createTokenAccountSignature: Keypair) {
	try {
	  // Attempt to change owner
	  await setAuthority(
		connection,
		payer,
		createTokenAccountSignature.publicKey,
		payer.publicKey,
		AuthorityType.AccountOwner,
		new Keypair().publicKey,
		undefined,
		undefined,
		TOKEN_2022_PROGRAM_ID,
	  );
	} catch (error) {
	  console.error('\x1b[31mFailed: Enforcing immutable owner. Owner cannot be changed for this token.\x1b[0m \n');
	}
  }
  
  async function createTokenAccountWithExtentions(connection: Connection, mint: PublicKey, payer: Keypair, tokenAccountKeypair: Keypair): Promise<string> {
	const tokenAccount = tokenAccountKeypair.publicKey;
  
	const extensions = [
	  // ExtensionType.DefaultAccountState, < -- On the Mint
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
		payer.publicKey,
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
  
	  // initializeDefaultAccountStateInstruction, < THIS GOES IN MINT
  
	  initializeRequiredMemoTransfersInstruction,
	  initializeCpiGuard,
	);
  
	// Send transaction
	return await sendAndConfirmTransaction(
	  connection,
	  transaction,
	  [payer, tokenAccountKeypair],
	);
  }
  
  function mintToTokenAccount(connection: Connection, payer: Keypair, mint: PublicKey, tokenAccount: PublicKey): Promise<string> {
  
	return mintTo(
	  connection,
	  payer,
	  mint,
	  tokenAccount,
	  payer.publicKey,
	  200,
	  undefined,
	  undefined,
	  TOKEN_2022_PROGRAM_ID,
	);
  }
  
  async function unfreezeAndMint(connection: Connection, payer: Keypair, tokenAccount: PublicKey, mint: PublicKey) {
	try {
	  // Unfreeze frozen token
	  const unfreezeAccount = await thawAccount(
		connection,
		payer,
		tokenAccount,
		mint,
		payer.publicKey,
		undefined,
		undefined,
		TOKEN_2022_PROGRAM_ID,
	  );
  
	  console.log('\x1b[32mSuccess: Frozen token thawed.\x1b[0m\n');
	  try {
		// Attempt to mint unfrozen token
		const mintUnfrozenTokenSignature = await mintToTokenAccount(
		  connection,
		  payer,
		  mint,
		  tokenAccount
		)
		console.log(`\x1b[32mSuccess: Token Minted ${mintUnfrozenTokenSignature} \x1b[0m\n`);
	  } catch (error) {
		console.log("Error minting: ", error)
	  }
	} catch (error) {
	  console.error("Error thawing token: ", error)
	}
  }
  
  async function transferWithoutMemo(mint: PublicKey, tokenAccount: PublicKey, payer: Keypair, connection: Connection) {
	const transferInstruction = createTransferInstruction(
	  mint,
	  tokenAccount,
	  payer.publicKey,
	  100,
	  undefined,
	  TOKEN_2022_PROGRAM_ID,
	);
  
	const message = "Hello, Solana";
	// Instruction to add memo
	const memoInstruction = new TransactionInstruction({
	  keys: [{ pubkey: payer.publicKey, isSigner: true, isWritable: true }],
	  data: Buffer.from(message, "utf-8"),
	  programId: new PublicKey("MemoSq4gqABAXKb96qnH8TysNcWxMyWCqXgDLGmfcHr"),
	});
  
	try {
	  let transaction = new Transaction().add(transferInstruction);
  
	  await sendAndConfirmTransaction(
		connection,
		transaction,
		[payer],
	  );
	} catch (error) {
	  console.error('\x1b[31mFailed: Enforcing Required Memo. Cannot transfer tokens without a Memo.\x1b[0m\n');
	}
	try {
	  let transaction = new Transaction().add(memoInstruction);
  
	  await sendAndConfirmTransaction(
		connection,
		transaction,
		[payer],
	  );
	  console.log(`\x1b[32mSuccess: Enforcing Required Memo. Successful transaction. \x1b[0m\n`);
  
	} catch (error) {
	  console.log("Error :", error);
	}
  }
  
  async function main() {
  
	/// SECITON 0 Setup
	const connection = new Connection('http://127.0.0.1:8899', 'confirmed');
	// const connection = new Connection(clusterApiUrl('devnet'), 'confirmed');
	const payer = await initializeKeypair(connection);
  
	const mintKeypair = Keypair.generate();
	const mint = mintKeypair.publicKey;
	const mintDecimals = 9;
  
	const tokenAccountKeypair = Keypair.generate();
	const tokenAccount = tokenAccountKeypair.publicKey;
  
  
	/// SECTION 1 Create the Mint and Token Account with all extentions
  
	const createMintSignature = await createToken22MintWithDefaultState(
	  connection,
	  payer,
	  mintKeypair,
	  mintDecimals,
	)
  
	const createTokenAccountSignature = await createTokenAccountWithExtentions(
	  connection,
	  mint,
	  payer,
	  tokenAccountKeypair
	)
  
	/// SECTION 2 Show how each extention functions by negative cases
	// show that the rules work for all execpt CPI gaurd
	{ // Default State ( Show how to unfreeze )
  
	  await unfreezeAndMint(
		connection,
		payer,
		tokenAccount,
		mint
	  )
	}
  
	{ // Cant change owner
	  await transferOwner(connection, payer, tokenAccountKeypair)
	}
  
	{
	  // Cannot transfer without memo
	  transferWithoutMemo(mint, tokenAccount, payer, connection)
	}
  }
  
  
  main();