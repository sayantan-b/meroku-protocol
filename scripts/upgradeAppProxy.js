// scripts/upgradeProxy.js
const { ethers, upgrades } = require("hardhat");
var file = require("./config.json");
async function main() {
  const AppNFT = await ethers.getContractFactory("AppNFTUpgradeable");
  // const appNFT = await upgrades.upgradeProxy(AppNFTUpgradeable, AppNFT);
  const appNFT = await upgrades.upgradeProxy(file.AppNFTUpgradeable, AppNFT, [
    file.DevNFTUpgradeable,
    file.DappNameList,
    process.env.TRUSTED_FORWARDER_ADDRESS,
  ]);
  console.log("AppNFT upgraded", appNFT);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
