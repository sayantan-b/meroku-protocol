const { ethers } = require("hardhat");
const csv = require('csv-parser');
const fs = require('fs');
const config = require("./config.json");
const contractAddress = config.AppNFTUpgradeable;


const startIndex = 1;
const endIndex = 3;

function validateDappId(dappId){
  if(dappId.length<4){
    throw new Error(`Error in dappId '${dappId}' : dappId is too short`);
  }
  if(dappId.slice(-4)!=".app"){
    throw new Error(`Error in dappId '${dappId}' : dappId does not end with .app`);
  }
  if(dappId.slice(0,-4).includes(".") || dappId.slice(0,-4).includes(" ")){
    throw new Error(`Error in dappId '${dappId}' : dappId contains . or a space`);
  }
  if(typeof dappId != "string"){
    throw new Error(`Error in dappId '${dappId}' : dappId is not a string`);
  }
  if(dappId.slice(0,-4).match(/[^\x00-\x7F]/g)){
    throw new Error(`Error in dappId '${dappId}' : dappId contains utf-8 characters`);
  }

}

async function estimateGas(to,tokenId,dappId,tokenURI){
  try{
    const contract = await ethers.getContractAt("AppNFTUpgradeable", contractAddress);
    const gasEstimate = await contract.estimateGas.bulkMintAndURIupdate(to,tokenId,dappId,tokenURI);
    const gasPrice = await ethers.provider.getGasPrice();
    console.log("gasEstimate: ", gasEstimate.toString()," | gasPrice: ",gasPrice.toString());
    const gasCost = gasEstimate.mul(gasPrice);
    const gasCostInEth = ethers.utils.formatEther(gasCost);
    console.log("gasCost:", gasCost.toString()," ~ gasCostInMATIC: ",gasCostInEth.toString());
    return gasEstimate.toString();
  }catch(e){
    console.log("\nError in estimateGas: ",e)
  }
}

async function funcCall(to,tokenId,dappId,tokenURI){
  try{
    const contract = await ethers.getContractAt("AppNFTUpgradeable", contractAddress);
    const tx = await contract.bulkMintAndURIupdate(to,tokenId,dappId,tokenURI);
    console.log("tx sent: ",tx.hash);
    const receipt = await tx.wait();
    console.log("tx mined: ",receipt.transactionHash);
  }catch(e){
    console.log("Error in funcCall: ",e.message)
  }
}

try{
  const results = [];
  fs.createReadStream('scripts/data/output.csv')
  .pipe(csv())
  .on('data', (data) => results.push(data))
  .on('end', async() => {
      // console.log(results);
      let tokenId = [];
      let dappId = [];
      let to = [];
      let tokenURI = [];
      let uriUpdateCount = 0;
      let mintCount = 0;
      if(endIndex == 0){
        endIndex = results.length;
      } else if(endIndex > results.length){
        throw new Error(`endIndex (${endIndex}) is greater than length of csv (${results.length})`);
      } else if(startIndex > endIndex){
        throw new Error(`startIndex (${startIndex}) is greater than endIndex (${endIndex})`);
      }

      for (let i = startIndex; i < endIndex; i++) {
        console.log("i",i, "dappId",results[i].dappId)
        validateDappId(results[i].dappId);
        tokenId.push(Number(results[i].tokenId));
        if(Number(results[i].tokenId) == 0){
          mintCount++;
        }else{
          uriUpdateCount++;
        }
        dappId.push(results[i].dappId);
        if(results[i].to == ""){
          to.push("0x0000000000000000000000000000000000000000");
        }else{
          if(to.includes(results[i].to)){
            throw new Error(`Error in dappId '${results[i].dappId}' : Provided to address '${results[i].to}' is repeated`);
          }
          to.push(results[i].to);
        }
        tokenURI.push(results[i].tokenURI);
      }

      if (tokenId.length === dappId.length && tokenId.length === to.length && tokenId.length === tokenURI.length) {
        console.log("Array lengths are equal, trxn good to go");
        console.log("quantity: ",tokenId.length)
        console.log("Total new mints : ",mintCount)
        console.log("Total URI updates : ",uriUpdateCount)
        // console.log("tokenId",tokenId)
        // console.log("dappId",dappId)
        // console.log("to",to)
        // console.log("tokenURI",tokenURI)
      }

      if(startIndex==0 && endIndex==0){
        console.log("running estimateGas for full list");
        await estimateGas(to,tokenId,dappId,tokenURI);
      }else{
        console.log("running estimateGas from index ",startIndex," to ",endIndex);
        await estimateGas(to,tokenId,dappId,tokenURI);
      }

      // get input from user to proceed with transaction
      const readline = require('readline').createInterface({
        input: process.stdin,
        output: process.stdout
      });
      readline.question(`Proceed with transaction? (y/n)`, async (input) => {
          if (input == 'y') {
            console.log("Proceeding with transaction");
            await funcCall(to,tokenId,dappId,tokenURI);
          }
          console.log("exiting");
          readline.close()
      })
      

  }
  );
}catch(err){
  console.log("err",err)
}

