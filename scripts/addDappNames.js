const { ethers } = require("hardhat");
const contractAddress = require("./config.json");
const appName = require("./reservedDappNames.json");
const devName = require("./reservedDevNames.json");
const appStoreName = require("./reservedAppStoreNames.json");

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
    console.log("adding Names error: ", err);
  }
}

async function main() {
  console.log("adding list of names");
  const signer = await ethers.getSigner();
  console.log("signer: ", signer.address);

  try {

    const startIndex = 2900;
    const stopIndex = 3100;
    const name = '.appStore'

    if(name == '.appStore'){
      console.log("startIndex: ", startIndex);
      let appStoreNameList = appStoreName.names.slice(startIndex, stopIndex);
      console.log("appStoreNameList Length: ", appStoreNameList.length);
      console.log(await addDappNames(appStoreNameList));

    } else if(name == '.app'){
      console.log("startIndex: ", startIndex);
      let appNameList = appName.names.slice(startIndex, stopIndex);
      console.log("appNameList Length: ", appNameList.length);
      console.log(await addDappNames(appNameList));

    } else if(name == '.dev'){
      console.log("startIndex: ", startIndex);
      let devNameList = devName.names.slice(startIndex, stopIndex);
      console.log("devNameList Length: ", devNameList.length);
      console.log(await addDappNames(devNameList));

    }  else {
      console.log("Invalid name");
      return;
    }




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
