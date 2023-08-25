// Import required modules
import * as anchor from "@coral-xyz/anchor";
import { web3, BN } from "@coral-xyz/anchor";
import {
  getOrCreateAssociatedTokenAccount,
  createMint,
} from "@solana/spl-token";
import { loadContractAndCallConstructor } from "./setup";
import * as mpl from "@metaplex-foundation/mpl-token-metadata";


// Define an async function to test contract loading and execution
async function testLoadContract() {
  // Load contract and initialize variables
  const { provider, program, payer, storage, program_key } =
    await loadContractAndCallConstructor(
      "Token", // Contract name
      8192,    // Maximum space
      "CwjJL7vfk73PkNtJLaFxN75upZYKnzX........", // Replace with the actual program ID
      []    // replace with Your keypair array example [251,184,217,212,213,115,122,212,............] 
    );

  // console.log("secret key", bs58.encode(payer.secretKey));

  // Call a method from the program
  const tx = await program.methods
    .new()
    .accounts({ dataAccount: storage.publicKey })
    .rpc();
  console.log(tx);

  // Connect to Solana node
  const connection = new web3.Connection(
    "https://api.devnet.solana.com", // Solana server endpoint
    "confirmed"
  );

  // Create a new mint
  const mint = await createMint(
    connection,
    payer,
    payer.publicKey,
    payer.publicKey,
    9
  );
  console.log(mint);

  // Set mint for the program
  const txc = await program.methods
    .setMint(mint)
    .accounts({ dataAccount: storage.publicKey })
    .rpc();
  console.log(txc);

  // Get or create associated token account
  const tokenAccount = await getOrCreateAssociatedTokenAccount(
    connection,
    payer,
    mint,
    payer.publicKey
  );
  console.log("tokenAccount", tokenAccount);

  // Mint tokens to the token account
  const txmint = await program.methods
    .mintTo(tokenAccount.address, payer.publicKey, new BN(100000000000))
    .accounts({ dataAccount: storage.publicKey })
    .remainingAccounts([
      { pubkey: mint, isSigner: false, isWritable: true },
      { pubkey: tokenAccount.address, isSigner: false, isWritable: true },
      { pubkey: payer.publicKey, isSigner: true, isWritable: false },
    ])
    .signers([payer])
    .rpc();
  console.log("txmint", txmint);

  // Create metadata account for the token
  const seed1 = Buffer.from(anchor.utils.bytes.utf8.encode("metadata"));
  const seed2 = Buffer.from(mpl.PROGRAM_ID.toBytes());
  const seed3 = Buffer.from(mint.toBytes());
  const [metadataPDA, _bump] = web3.PublicKey.findProgramAddressSync(
    [seed1, seed2, seed3],
    mpl.PROGRAM_ID
  );

  // Define accounts and data for metadata creation
  const accounts = {
    metadata: metadataPDA,
    mint,
    mintAuthority: payer.publicKey,
    payer: payer.publicKey,
    updateAuthority: payer.publicKey,
  };

  const dataV2 = {
    name: "UnityToken",
    symbol: "UNT",
    uri: "",
    sellerFeeBasisPoints: 0,
    creators: null,
    collection: null,
    uses: null,
  };

  const args = {
    createMetadataAccountArgsV3: {
      data: dataV2,
      isMutable: true,
      collectionDetails: null,
    },
  };

  // Create instruction for metadata account creation
  const ix = mpl.createCreateMetadataAccountV3Instruction(accounts, args);
  const tx3 = new web3.Transaction();
  tx3.add(ix);

  // Send and confirm metadata account creation transaction
  const txid = await web3.sendAndConfirmTransaction(connection, tx3, [payer]);
  console.log(txid);

  // Get total supply and balance from the program
  let total_supply1 = await program.methods
    .totalSupply()
    .accounts({ dataAccount: storage.publicKey })
    .remainingAccounts([{ pubkey: mint, isSigner: false, isWritable: false }])
    .view();
  console.log("total_supply1", total_supply1.toString());

  let balance1 = await program.methods
    .getBalance(tokenAccount.address)
    .accounts({ dataAccount: storage.publicKey })
    .remainingAccounts([
      { pubkey: tokenAccount.address, isSigner: false, isWritable: false },
    ])
    .view();
  console.log("balance1", balance1.toString());
  const theOutsider = web3.Keypair.generate();

  const otherTokenAccount = await getOrCreateAssociatedTokenAccount(
    connection,
    payer,
    mint,
    theOutsider.publicKey
  )

  console.log('other', theOutsider.publicKey)
  const txt = await program.methods.transfer(
    tokenAccount.address,
    otherTokenAccount.address,
    payer.publicKey,
    new BN(100))
    .accounts({ dataAccount: storage.publicKey })
    .remainingAccounts([
      { pubkey: otherTokenAccount.address, isSigner: false, isWritable: true },
      { pubkey: tokenAccount.address, isSigner: false, isWritable: true },
      { pubkey: payer.publicKey, isSigner: true, isWritable: false },
    ])
    .signers([payer])
    .rpc();

  console.log(txt);
}

// Call the testing function
testLoadContract();