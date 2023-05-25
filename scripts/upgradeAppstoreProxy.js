// scripts/upgradeProxy.js
const { ethers, upgrades } = require("hardhat");
var file = require("./config.json");
async function main() {
  const AppStoreNFT = await ethers.getContractFactory("AppStoreNFTUpgradeable");
  // const appNFT = await upgrades.upgradeProxy(AppNFTUpgradeable, AppNFT);
  const appStoreNFT = await upgrades.upgradeProxy(
    file.AppStoreNFTUpgradeable,
    AppStoreNFT,
    [process.env.TRUSTED_FORWARDER_ADDRESS]
  );
  console.log("AppStoreNFT upgraded", appStoreNFT);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
