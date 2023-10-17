require("@nomicfoundation/hardhat-toolbox");
require("@openzeppelin/hardhat-upgrades");
require("@nomiclabs/hardhat-solhint");
require("hardhat-gas-reporter");
require("@nomiclabs/hardhat-ethers");
// require("@nomiclabs/hardhat-waffle");

require("dotenv/config");

const accounts = {
  mnemonic: "",
};
/** @type import('hardhat/config').HardhatUserConfig */
module.exports = {
  abiExporter: {
    path: "./build/abi",
    //clear: true,
    flat: true,
    // only: [],
    // except: []
  },
  gasReporter: {
    enabled: true,
    currency: "USD",
    coinmarketcap: process.env.COINMARKETCAP_API_KEY,
    excludeContracts: ["contracts/mocks/", "contracts/libraries/"],
    url: "https://polygon-rpc.com/",
    token: "MATIC",
    gasPriceApi:
      "https://api.polygonscan.com/api?module=proxy&action=eth_gasPrice",
    // gasPrice: 160
  },
  etherscan: {
    // Your API key for Etherscan
    // Obtain one at https://etherscan.io/
    apiKey: {
      //ethereum
      mainnet: process.env.ETHERSCAN_API_KEY,
      ropsten: process.env.ETHERSCAN_API_KEY,
      rinkeby: process.env.ETHERSCAN_API_KEY,
      goerli: process.env.ETHERSCAN_API_KEY,
      kovan: process.env.ETHERSCAN_API_KEY,
      sepolia: process.env.ETHERSCAN_API_KEY,

      //polygon
      polygon: process.env.POLYGONSCAN_API_KEY,
      polygonMumbai: process.env.POLYGONSCAN_API_KEY,
    },
    customChains: [],
  },
  networks: {
    hardhat: {
      chainId: 31337,
      // accounts,
    },
    mainnet: {
      url: `https://eth-mainnet.g.alchemy.com/v2/${process.env.ALCHEMY_API_KEY}`,
      accounts,
      from: "",
      chainId: 1,
      live: true,
      saveDeployments: true,
      tags: ["mainnet"],
      gasPrice: 20000000000,
      gasMultiplier: 5,
      timeout: 200000,
    },
    goerli: {
      url: `https://eth-goerli.g.alchemy.com/v2/${process.env.ALCHEMY_API_KEY}`,
      accounts: [process.env.PRIVATE_KEY], //add private key in this
      chainId: 5,
      live: true,
      saveDeployments: true,
      tags: ["staging"],
      gasPrice: 20000000000,
      gasMultiplier: 2,
    },
    mumbai: {
      url: `https://rpc.ankr.com/polygon_mumbai`,
      accounts: [process.env.PRIVATE_KEY], //add private key in this
      chainId: 80001,
      live: true,
      saveDeployments: true,
      tags: ["staging"],
      gasPrice: 3000000000,
      gasMultiplier: 2,
      timeout: 100000
    },
    polygon: {
      url: `https://polygon-mainnet.chainstacklabs.com`,
      accounts: [process.env.PRIVATE_KEY], //add private key in this
      chainId: 137,
      live: true,
      saveDeployments: true,
      tags: ["mainnet"],
      gasPrice: 300000000000,
    },
  },
  solidity: {
    compilers: [
      {
        version: "0.8.0",
        settings: {
          optimizer: {
            enabled: true,
            runs: 200,
          },
        },
      },
      {
        version: "0.8.1",
        settings: {
          optimizer: {
            enabled: true,
            runs: 200,
          },
        },
      },
      {
        version: "0.8.9",
        settings: {
          optimizer: {
            enabled: true,
            runs: 200,
          },
        },
      },
    ],
  },
  paths: {
    sources: "./contracts",
    tests: "./test",
    cache: "./cache",
    artifacts: "./artifacts",
  },
  mocha: {
    timeout: 40000,
  },
};
