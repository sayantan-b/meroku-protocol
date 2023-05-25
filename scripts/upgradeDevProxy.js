// scripts/upgradeProxy.js
const { ethers, upgrades } = require("hardhat");
var file = require("./config.json");
async function main() {
  const DevNFT = await ethers.getContractFactory("DevNFTUpgradeable");
  const devNFT = await upgrades.upgradeProxy(file.DevNFTUpgradeable, DevNFT, [
    process.env.TRUSTED_FORWARDER_ADDRESS,
  ]);
  console.log("DevNFT upgraded", devNFT);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
