// scripts/create-box.js
const { ethers, upgrades } = require("hardhat");
async function main() {
  // Replace the stuck transaction
  const previousTxHash =
    "0xec7c308c0ed9fc904e7519c1499bce5ab4ccd06539f8107d89988b38488911ae"; // Replace with your original transaction hash
  const previousTx = await ethers.provider.getTransaction(previousTxHash);
  const newGasPrice = ethers.utils.parseUnits("200", "gwei"); // Replace with your desired gas price in gwei

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
