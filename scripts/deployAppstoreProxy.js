// scripts/create-box.js
const { ethers, upgrades } = require("hardhat");
const fs = require("fs");
const fileName = "./scripts/config.json";
var file = require("./config.json");

async function main() {
  const AppStoreNFT = await ethers.getContractFactory("AppStoreNFTUpgradeable");
  const appStoreNFT = await upgrades.deployProxy(AppStoreNFT, [
    file.DevNFTUpgradeable,
    file.DappNameList,
    process.env.TRUSTED_FORWARDER_ADDRESS,
  ]);
  await appStoreNFT.deployed();
  console.log("AppStoreNFT deployed to:", appStoreNFT.address);
  file.AppStoreNFTUpgradeable = appStoreNFT.address;
  fs.writeFileSync(
    fileName,
    JSON.stringify(file, null, 2),
    function writeJSON(err) {
      if (err) return console.log(err);
      console.log(JSON.stringify(file));
      console.log("writing to " + fileName);
    }
  );
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
