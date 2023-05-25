const { ethers } = require("hardhat");
const contractAddress = require("./config.json");
const { names } = require("./reservedDappNames.json");

async function addDappNames(names) {
  try {
    // ethers function to call dappNameList contract's function setDappName
    // setDappName takes in an array of strings and adds them to the dappNames array
    // in the dappNameList contract
    const dappNameList = new ethers.Contract(
      contractAddress.DappNameList,
      ["function setDappNames(string[] memory dappNames)"],
      ethers.provider.getSigner()
    );
    return await dappNameList.setDappNames(names);
  } catch (err) {
    console.log("addDappNames error: ", err);
  }
}

async function main() {
  console.log("adding list of dapp names");
  const signer = await ethers.getSigner();
  console.log("signer: ", signer.address);

  try {
    const startIndex = 2900;
    const stopIndex = 3100;

    console.log("startIndex: ", startIndex);
    let appNameList = names.slice(startIndex, stopIndex);
    console.log("appNameList Length: ", appNameList.length);

    console.log(await addDappNames(appNameList));

    // const [deployer] = await ethers.getSigners();
    // const DappNameListAddress = contractAddress.DappNameList
    // const DappNameList = await ethers.getContractFactory("dappNameList");
    // const dappNameListInstance = await DappNameList.attach(DappNameListAddress);
    // await dappNameListInstance.connect(deployer).setDappNames(appNameList);
  } catch (e) {
    console.log("Error in addDappNames trx: ", e);
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
