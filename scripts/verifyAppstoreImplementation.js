const { ethers } = require("hardhat");
const contractAddress = require("./config.json");


async function verifyAppStoreNFT() {
    try{
        await run("verify:verify", {
            constructorArguments: [],
            contract: "contracts/AppStoreNFTUpgradeable.sol:AppStoreNFTUpgradeable",
            address: contractAddress.AppStoreNFTUpgradeable
          });
    } catch (err) {
        console.log("verifyFactory error: ", err)
    }
    
}

async function main() {
    console.log("starting verify");

    await verifyAppStoreNFT();

}

main()
    .then(() => process.exit(0))
    .catch(error => {
        console.error(error);
        process.exit(1);
    });
    