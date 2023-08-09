// scripts/create-box.js
const { ethers, upgrades } = require("hardhat");
async function main() {
  // Replace the stuck transaction
  const previousTxHash =
    "0xb85d06fe1d8c374c251a09a19e2df9a19d370e7063c1d8871932b7da8e3cd06b "; // Replace with your original transaction hash
  const previousTx = await ethers.provider.getTransaction(previousTxHash);
  const newGasPrice = ethers.utils.parseUnits("350", "gwei"); // Replace with your desired gas price in gwei

  console.log("Previous transaction:", previousTx);
  if (previousTx && previousTx.blockNumber === null) {
    console.log("Replacing the previous transaction with a new one...");

    const txParams = {
      to: previousTx.to,
      nonce: previousTx.nonce,
      gasPrice: newGasPrice,
      data: previousTx.data,
    };
    console.log("New transaction parameters:", txParams);

    try {
      const signer = await ethers.getSigner(); // Replace with your preferred signer
      const replacementTx = await signer.sendTransaction(txParams);
      console.log("Replacement transaction sent:", replacementTx.hash);
    } catch (e) {
      console.log("Error in replace trx: ", e);
    }
  } else {
    console.log("No pending transaction found to replace.");
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
