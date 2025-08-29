import { NextResponse } from "next/server";

export async function POST() {
  try {
    if (process.env.SOLANA_FUNDS_ENABLED !== 'true') {
      return NextResponse.json({
        error: 'Faucet is disabled in this environment'
      }, { status: 501 });
    }

    const privateKey = process.env.SOLANA_PRIVATE_KEY;
    
    if (!privateKey) {
      return NextResponse.json({
        error: "SOLANA_PRIVATE_KEY environment variable is not set"
      }, { status: 500 });
    }

    console.log('Requesting SOL airdrop from devnet faucet...');
    
    // Dynamically import web3 and bs58 to avoid bundling unless used
    const { Connection, Keypair, LAMPORTS_PER_SOL } = await import("@solana/web3.js");
    const { default: bs58 } = await import("bs58");

    // Create keypair from private key
    const keypair = Keypair.fromSecretKey(bs58.decode(privateKey));
    const publicKey = keypair.publicKey;
    
    // Connect to Solana devnet
    const connection = new Connection(
      process.env.SOLANA_RPC_URL || 'https://api.devnet.solana.com', 
      'confirmed'
    );
    
    // Request airdrop from Solana devnet faucet
    const airdropSignature = await connection.requestAirdrop(
      publicKey,
      2 * LAMPORTS_PER_SOL // Request 2 SOL
    );
    
    // Wait for confirmation
    await connection.confirmTransaction(airdropSignature);
    
    // Get new balance
    const newBalance = await connection.getBalance(publicKey);
    
    console.log('SOL airdrop successful');
    
    return NextResponse.json({
      success: true,
      message: 'SOL airdrop successful',
      signature: airdropSignature,
      newBalance: newBalance / LAMPORTS_PER_SOL,
      address: publicKey.toString()
    });

  } catch (error) {
    console.error('Error requesting airdrop:', error);
    return NextResponse.json({
      error: error instanceof Error ? error.message : "Unknown error occurred"
    }, { status: 500 });
  }
}
