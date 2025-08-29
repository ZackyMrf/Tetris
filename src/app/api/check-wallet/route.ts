import { NextResponse } from "next/server";

export async function GET() {
  try {
    if (process.env.IRYS_UPLOAD_ENABLED !== 'true') {
      return NextResponse.json({
        success: false,
        error: 'Check-wallet is disabled in this environment'
      }, { status: 501 });
    }

    const privateKey = process.env.SOLANA_PRIVATE_KEY;
    
    if (!privateKey) {
      return NextResponse.json({
        error: "SOLANA_PRIVATE_KEY environment variable is not set"
      }, { status: 500 });
    }

    console.log('Checking Solana wallet configuration...');
    
    // Dynamically import heavy SDKs
    const { Uploader } = await import("@irys/upload");
    const { Solana } = await import("@irys/upload-solana");
    const { Connection, Keypair, LAMPORTS_PER_SOL } = await import("@solana/web3.js");
    const { default: bs58 } = await import("bs58");

    // Initialize uploader for Solana devnet
    const uploader = await Uploader(Solana)
      .withWallet(privateKey)
      .withRpc(process.env.SOLANA_RPC_URL || 'https://api.devnet.solana.com')
      .devnet();

    // Get wallet address
    const address = uploader.address;

    // Get Irys balance
    let irysBalance = "Unknown";
    try {
      const balance = await uploader.getBalance();
      irysBalance = uploader.utils.fromAtomic(balance).toString();
    } catch (error) {
      console.log('Could not get Irys balance:', error);
    }

    // Get SOL balance from Solana
    let solBalance = "Unknown";
    try {
      const keypair = Keypair.fromSecretKey(bs58.decode(privateKey));
      const connection = new Connection(process.env.SOLANA_RPC_URL || 'https://api.devnet.solana.com', 'confirmed');
      const balance = await connection.getBalance(keypair.publicKey);
      solBalance = (balance / LAMPORTS_PER_SOL).toString();
    } catch (error) {
      console.log('Could not get SOL balance:', error);
    }

    console.log('Wallet check completed');
    
    return NextResponse.json({
      success: true,
      wallet: {
        address,
        network: "Solana Devnet",
        rpcUrl: process.env.SOLANA_RPC_URL || 'https://api.devnet.solana.com',
        configuration: "Using Uploader(Solana).withWallet().withRpc().devnet()"
      },
      balances: {
        irys: {
          balance: irysBalance,
          unit: "SOL"
        },
        solana: {
          balance: solBalance,
          unit: "SOL"
        }
      },
      message: "Uploader initialized successfully for Solana devnet."
    });

  } catch (error) {
    console.error('Wallet check failed:', error);
    return NextResponse.json({
      error: error instanceof Error ? error.message : "Unknown error occurred"
    }, { status: 500 });
  }
}
