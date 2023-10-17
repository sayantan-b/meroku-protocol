const { ethers } = require("hardhat");

const contractAddress = require("./config.json");

const dappNameList = require("./reservedDappNames.json");
const devNameList = require("./reservedDevNames.json");
const appStoreNameList = require("./reservedAppStoreNames.json");


async function addDappNames(names) {
  try {
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

async function whitelist(listName, startIndex, stopIndex) {
  try {
    do{
      console.log("whitlisting initiated from: ", startIndex, "to: ", stopIndex);
      let listNameList = listName.slice(startIndex, startIndex+100);
      console.log("list length: ", listNameList.length);
      console.log(await addDappNames(listNameList));

      console.log("list from name: ", listNameList[0], "to: ", listNameList[listNameList.length-1], "added successfully");
      startIndex = startIndex+100;
      }while(startIndex < stopIndex);

} catch (e) {
  console.log("Error in whitelist trx: ", e);
}
}

async function main() {
  console.log("adding list of names");
  const signer = await ethers.getSigner();
  console.log("signer: ", signer.address);

  let listNameList = [];

  // fetching dapp names
  if(dappNameList.whitelisted != dappNameList.names.length){
    console.log("fetching newly added dapp names");
    const list = dappNameList.names.slice(dappNameList.whitelisted, dappNameList.names.length);
    console.log("list: ", list[0], "to: ", list[list.length-1]);
    listNameList.push(...list)
  }

  // fetching dev names
  if(devNameList.whitelisted != devNameList.names.length){
    console.log("fetching newly added dev names");
    const list = devNameList.names.slice(devNameList.whitelisted, devNameList.names.length);
    console.log("list: ", list[0], "to: ", list[list.length-1]);
    listNameList.push(...list)
  }

  // fetching appStore names
  if(appStoreNameList.whitelisted != appStoreNameList.names.length){
    console.log("fetching newly added appStore names");
    const list = appStoreNameList.names.slice(appStoreNameList.whitelisted, appStoreNameList.names.length);
    console.log("list: ", list[0], "to: ", list[list.length-1]);
    listNameList.push(...list)
  }

  // console.log("listNameList: ", listNameList);

  if(listNameList.length == 0){
    console.log("no new names to add");
    return;
  }
  await whitelist(listNameList, 0, listNameList.length);

}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
