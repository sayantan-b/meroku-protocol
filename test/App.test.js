const {
  time,
  loadFixture,
} = require("@nomicfoundation/hardhat-network-helpers");
const { anyValue } = require("@nomicfoundation/hardhat-chai-matchers/withArgs");
const { expect } = require("chai");
const ADDRESS_ZERO = "0x0000000000000000000000000000000000000000";
const blockedDappNames = require("../scripts/backend/appNames.json");
require("dotenv");
describe(".app & .dev NFT minting", function () {
  // We define a fixture to reuse the same setup in every test.
  // We use loadFixture to run this setup once, snapshot that state,
  // and reset Hardhat Network to that snapshot in every test.
  async function deployNFTsFixture() {
    const ONE_YEAR_IN_SECS = 365 * 24 * 60 * 60;
    const ONE_GWEI = 1_000_000_000;

    const lockedAmount = ONE_GWEI;
    const unlockTime = (await time.latest()) + ONE_YEAR_IN_SECS;
    const symbolOfDevNFT = "MerokuDev";
    const nameOfDevNFT = "MerokuDev";
    const symbolOfAppNFT = "appNFT";
    const nameOfAppNFT = "appNFT";

    // Contracts are deployed using the first signer/account by default
    const [owner, account1, account2, otherAccount] = await ethers.getSigners();
    const devName = {
      owner: "ownerDevName",
      account1: "account1DevName",
      account2: "account2DevName",
      otherAccount: "otherAccountDevName",
    };
    const devNameLower = {
      owner: "ownerdevname",
      account1: "account1devname",
      account2: "account2devname",
      otherAccount: "otheraccountdevname",
    };
    const dev_uri = ".devNFT.com";
    const specialdAppNames = ["uniswap.app", "curve.app", "sushiswap.app"];
    const DappNameList = await ethers.getContractFactory("dappNameList");
    const dappNameList = await DappNameList.deploy();
    await dappNameList.deployed();
    await dappNameList.setDappNames(specialdAppNames);
    const DevNFT = await ethers.getContractFactory("DevNFTUpgradeable");
    const devNFT = await upgrades.deployProxy(DevNFT, [
      dappNameList.address,
      process.env.TRUSTED_FORWARDER_ADDRESS,
    ]);
    await devNFT.deployed();
    await devNFT.setPayForMintFlag(false);
    const appName = {
      owner: "ownerAppName",
      account1: "account1AppName",
      account2: "account2AppName",
      otherAccount: "otherAccountAppName",
    };
    const appNameLower = {
      owner: "ownerappname",
      account1: "account1appname",
      account2: "account2appname",
      otherAccount: "otheraccountappname",
    };
    const app_uri = ".appNFT.com";

    const AppNFT = await ethers.getContractFactory("AppNFTUpgradeable");
    const appNFT = await upgrades.deployProxy(AppNFT, [
      devNFT.address,
      dappNameList.address,
      process.env.TRUSTED_FORWARDER_ADDRESS,
    ]);
    await appNFT.deployed();
    // const devNFT = await DevNFT.deploy();
    await appNFT.setPayForMintFlag(false);

    return {
      devNFT,
      appNFT,
      dappNameList,
      symbolOfDevNFT,
      symbolOfAppNFT,
      nameOfDevNFT,
      nameOfAppNFT,
      owner,
      account1,
      account2,
      otherAccount,
      devName,
      devNameLower,
      appName,
      appNameLower,
      dev_uri,
      app_uri,
      specialdAppNames,
    };
  }

  async function basicMintDone(
    devNFT,
    appNFT,
    dev_uri,
    app_uri,
    devName,
    appName,
    appNameLower
  ) {
    const [owner, account1, account2, otherAccount] = await ethers.getSigners();

    await devNFT.safeMintDevNFT(owner.address, dev_uri, devName.owner);
    await devNFT
      .connect(account1)
      .safeMintDevNFT(account1.address, dev_uri, devName.account1);
    await appNFT.safeMintAppNFT(owner.address, app_uri, appName.owner);
    await appNFT
      .connect(account1)
      .safeMintAppNFT(account1.address, app_uri, appName.account1);
  }

  describe("Deployment", function () {
    it("Should give the right name and symbol of Dev NFT", async function () {
      const { devNFT, symbolOfDevNFT, nameOfDevNFT } = await loadFixture(
        deployNFTsFixture
      );

      expect(await devNFT.name()).to.equal(nameOfDevNFT);
      expect(await devNFT.symbol()).to.equal(symbolOfDevNFT);
    });

    it("Should set the right owner of devNFT", async function () {
      const { devNFT, owner } = await loadFixture(deployNFTsFixture);

      expect(await devNFT.owner()).to.equal(owner.address);
    });

    it("Should give the right name and symbol of Dev NFT", async function () {
      const { appNFT, symbolOfAppNFT, nameOfAppNFT } = await loadFixture(
        deployNFTsFixture
      );

      expect(await appNFT.name()).to.equal(symbolOfAppNFT);
      expect(await appNFT.symbol()).to.equal(nameOfAppNFT);
    });

    it("Should set the right owner appNFT", async function () {
      const { appNFT, owner } = await loadFixture(deployNFTsFixture);

      expect(await appNFT.owner()).to.equal(owner.address);
    });

    it("Should set the right owner dappNameList", async function () {
      const { dappNameList, owner } = await loadFixture(deployNFTsFixture);

      expect(await dappNameList.owner()).to.equal(owner.address);
    });
  });

  describe("Mint .devNFT", function () {
    describe("Validations", function () {
      it("Should revert with the right error if called from non-owner account in safeMint", async function () {
        const { devNFT, otherAccount, devName, dev_uri } = await loadFixture(
          deployNFTsFixture
        );

        await expect(
          devNFT
            .connect(otherAccount)
            .safeMint(
              otherAccount.address,
              devName.otherAccount + dev_uri,
              devName.otherAccount
            )
        ).to.be.revertedWith("Ownable: caller is not the owner");
      });

      it("Shouldn't fail safeMint call if the owner calls it", async function () {
        const { devNFT, owner, devName, dev_uri } = await loadFixture(
          deployNFTsFixture
        );
        await expect(
          devNFT.safeMint(owner.address, devName.owner + dev_uri, devName.owner)
        ).not.to.be.reverted;
      });

      it("Shouldn't fail safeMintDevNFT call if any address calls for first time", async function () {
        const { devNFT, account1, devName, dev_uri } = await loadFixture(
          deployNFTsFixture
        );
        await expect(
          devNFT
            .connect(account1)
            .safeMintDevNFT(account1.address, dev_uri, devName.account1)
        ).not.to.be.reverted;
      });

      it("Should revert with the right error if safeMintDevNFT called again by same user", async function () {
        const { devNFT, account1, devName, dev_uri } = await loadFixture(
          deployNFTsFixture
        );
        // Called first time
        devNFT
          .connect(account1)
          .safeMintDevNFT(account1.address, dev_uri, devName.account1);
        // Caled second time
        await expect(
          devNFT
            .connect(account1)
            .safeMintDevNFT(account1.address, dev_uri, devName.account1)
        ).to.be.revertedWith("provided wallet already used to create dev");
      });

      it("Should revert when the devName is already in use", async function () {
        const {
          devNFT,
          appNFT,
          owner,
          otherAccount,
          devName,
          appName,
          appNameLower,
          dev_uri,
          app_uri,
        } = await loadFixture(deployNFTsFixture);

        await basicMintDone(
          devNFT,
          appNFT,
          dev_uri,
          app_uri,
          devName,
          appName,
          appNameLower
        );

        await expect(
          devNFT
            .connect(otherAccount)
            .safeMintDevNFT(otherAccount.address, dev_uri, devName.owner)
        ).to.be.revertedWith("ERC721NameStorage: this Name already in use");
      });
    });

    describe("Events", function () {
      it("Should emit an event on safeMint", async function () {
        const { devNFT, owner, devName, dev_uri } = await loadFixture(
          deployNFTsFixture
        );

        await expect(
          devNFT.safeMint(owner.address, devName.owner + dev_uri, devName.owner)
        )
          .to.emit(devNFT, "Transfer")
          .withArgs(ADDRESS_ZERO, owner.address, anyValue); // We accept any value as `when` arg
      });
    });
  });

  describe("Transfer .devNFT", function () {
    describe("Validations", function () {
      it("Should revert with the right error if transferred to recipient who already owns .dev", async function () {
        const { devNFT, account1, account2, otherAccount, devName, dev_uri, devNameLower } = await loadFixture(
          deployNFTsFixture
        );

        await expect(
          devNFT
            .connect(account1)
            .safeMintDevNFT(
              account1.address,
              devName.account1 + dev_uri,
              devName.account1
            )
        ).not.to.be.reverted;

        await expect(
          devNFT
            .connect(otherAccount)
            .safeMintDevNFT(
              otherAccount.address,
              devName.otherAccount + dev_uri,
              devName.otherAccount
            )
        ).not.to.be.reverted;

        const tokenIDaccount1 = await devNFT.tokenIdForName(
          `${devNameLower.account1}.dev`
        );

        const tokenIDotherAccount = await devNFT.tokenIdForName(
          `${devNameLower.otherAccount}.dev`
        );

        await expect(
          devNFT
            .connect(account1)
            .transferFrom(
              account1.address,
              otherAccount.address,
              tokenIDaccount1
            )
        ).to.be.revertedWith("Recepient already owns a MerokuDev");

        await expect(
          devNFT
            .connect(otherAccount)
            .transferFrom(
              otherAccount.address,
              account2.address,
              tokenIDotherAccount
            )
        ).not.to.be.reverted;

        await expect(
          devNFT
            .connect(account1)
            .transferFrom(
              account1.address,
              otherAccount.address,
              tokenIDaccount1
            )
        ).not.to.be.reverted;
      });

      it("Should'nt fail when transferred to recipient who doesn't owns .dev", async function () {
        const { devNFT, account1, otherAccount, devName, dev_uri, devNameLower } = await loadFixture(
          deployNFTsFixture
        );

        await expect(
          devNFT
            .connect(account1)
            .safeMintDevNFT(
              account1.address,
              devName.account1 + dev_uri,
              devName.account1
            )
        ).not.to.be.reverted;

        const tokenID = await devNFT.tokenIdForName(
          `${devNameLower.account1}.dev`
        );

        await expect(
          devNFT
            .connect(account1)
            .transferFrom(
              account1.address,
              otherAccount.address,
              tokenID
            )
        ).not.to.be.reverted;

        expect(await devNFT.ownerOf( tokenID )).to.equal(otherAccount.address);
      });
    })
  })

  describe("Mint .appNFT", function () {
    describe("Validations", function () {
      it("Should revert with the right error if called from non-owner account in safeMint", async function () {
        const { appNFT, otherAccount, appName, appNameLower, app_uri } =
          await loadFixture(deployNFTsFixture);

        await expect(
          appNFT
            .connect(otherAccount)
            .safeMint(
              otherAccount.address,
              appName.otherAccount + app_uri,
              appName.otherAccount
            )
        ).to.be.revertedWith("Ownable: caller is not the owner");
      });

      it("Shouldn't fail safeMint call if the owner calls it", async function () {
        const { appNFT, owner, appName, appNameLower, app_uri } =
          await loadFixture(deployNFTsFixture);
        await expect(
          appNFT.safeMint(owner.address, appName.owner + app_uri, appName.owner)
        ).not.to.be.reverted;
      });

      it("Shouldn't fail safeMintAppNFT call if any address calls for first time after minting .devNFT", async function () {
        const {
          devNFT,
          appNFT,
          account1,
          devName,
          appName,
          appNameLower,
          app_uri,
          dev_uri,
        } = await loadFixture(deployNFTsFixture);
        await devNFT
          .connect(account1)
          .safeMintDevNFT(account1.address, dev_uri, devName.account1);
        await expect(
          appNFT
            .connect(account1)
            .safeMintAppNFT(account1.address, app_uri, appName.account1)
        ).not.to.be.reverted;
      });

      it("Should not revert with the right error if safeMintAppNFT called by user without minting .devNFT", async function () {
        const { appNFT, account1, appName, appNameLower, app_uri } =
          await loadFixture(deployNFTsFixture);

        await expect(
          appNFT
            .connect(account1)
            .safeMintAppNFT(account1.address, app_uri, appName.account1)
        ).not.to.be.reverted;
      });

      it("Should revert with the right error if more than 1 appName is minted by same user", async function () {
        const {
          devNFT,
          appNFT,
          account1,
          devName,
          appName,
          appNameLower,
          dev_uri,
          app_uri,
        } = await loadFixture(deployNFTsFixture);

        await devNFT
          .connect(account1)
          .safeMintDevNFT(account1.address, dev_uri, devName.account1);
        await expect(
          appNFT
            .connect(account1)
            .safeMintAppNFT(account1.address, app_uri, appName.account1)
        );
        await expect(
          appNFT
            .connect(account1)
            .safeMintAppNFT(account1.address, app_uri, appName.account1)
        ).to.be.revertedWith("provided wallet already used to create app");
      });

      it("Shouldn't fail safeMintAppNFT call if more than 1 appName is minted by same user when mintManyFlag is turned true by owner", async function () {
        const {
          devNFT,
          appNFT,
          account1,
          devName,
          appName,
          appNameLower,
          dev_uri,
          app_uri,
        } = await loadFixture(deployNFTsFixture);

        await appNFT.setMintManyFlag(true);
        await devNFT
          .connect(account1)
          .safeMintDevNFT(account1.address, dev_uri, devName.account1);
        await expect(
          appNFT
            .connect(account1)
            .safeMintAppNFT(account1.address, app_uri, appName.account1)
        );

        await expect(
          appNFT
            .connect(account1)
            .safeMintAppNFT(account1.address, app_uri, "secondName")
        ).not.to.be.reverted;
        expect(await appNFT.tokensName(1)).to.equal(
          `${appNameLower.account1}.app`
        );
        expect(await appNFT.tokensName(2)).to.equal("secondname.app");
      });
    });

    describe("appName validations", function () {
      it("Should revert when the appName is already in use", async function () {
        const {
          devNFT,
          appNFT,
          owner,
          otherAccount,
          devName,
          appName,
          appNameLower,
          dev_uri,
          app_uri,
        } = await loadFixture(deployNFTsFixture);

        await basicMintDone(
          devNFT,
          appNFT,
          dev_uri,
          app_uri,
          devName,
          appName,
          appNameLower
        );
        devNFT
          .connect(otherAccount)
          .safeMintDevNFT(otherAccount.address, dev_uri, devName.otherAccount);

        await expect(
          appNFT
            .connect(otherAccount)
            .safeMintAppNFT(otherAccount.address, app_uri, appName.owner)
        ).to.be.revertedWith("ERC721NameStorage: this Name already in use");
      });

      it("Should revert when the appName's special ie length is less than equal to 3", async function () {
        const {
          devNFT,
          appNFT,
          owner,
          otherAccount,
          devName,
          appName,
          appNameLower,
          dev_uri,
          app_uri,
        } = await loadFixture(deployNFTsFixture);

        await basicMintDone(
          devNFT,
          appNFT,
          dev_uri,
          app_uri,
          devName,
          appName,
          appNameLower
        );
        await devNFT
          .connect(otherAccount)
          .safeMintDevNFT(otherAccount.address, dev_uri, devName.otherAccount);

        await expect(
          appNFT
            .connect(otherAccount)
            .safeMintAppNFT(otherAccount.address, app_uri, "XX")
        ).to.be.revertedWith("Minting of such names is restricted currently");
      });

      it("Should'nt fail when user mints special appNames when mintSpecialFlag is turned true by owner", async function () {
        const {
          devNFT,
          appNFT,
          owner,
          otherAccount,
          devName,
          appName,
          appNameLower,
          dev_uri,
          app_uri,
        } = await loadFixture(deployNFTsFixture);

        await basicMintDone(
          devNFT,
          appNFT,
          dev_uri,
          app_uri,
          devName,
          appName,
          appNameLower
        );
        await devNFT
          .connect(otherAccount)
          .safeMintDevNFT(otherAccount.address, dev_uri, devName.otherAccount);

        await appNFT.setMintSpecialFlag(true);
        await expect(
          appNFT
            .connect(otherAccount)
            .safeMintAppNFT(otherAccount.address, app_uri, "XX")
        ).not.to.be.reverted;
        expect(await appNFT.tokensName(3)).to.equal("xx.app");
      });

      it("Should revert when the appName's blacklisted ie present in dappNameList", async function () {
        const {
          devNFT,
          appNFT,
          dappNameList,
          owner,
          otherAccount,
          devName,
          appName,
          appNameLower,
          dev_uri,
          app_uri,
          specialdAppNames,
        } = await loadFixture(deployNFTsFixture);

        await devNFT
          .connect(otherAccount)
          .safeMintDevNFT(otherAccount.address, dev_uri, devName.otherAccount);

        await expect(
          appNFT
            .connect(otherAccount)
            .safeMintAppNFT(otherAccount.address, app_uri, specialdAppNames[1])
        ).to.be.revertedWith("App name reserved");
      });

      it("Should'nt fail when user mints special appNames when mintSpecialFlag is turned off by owner", async function () {
        const {
          devNFT,
          appNFT,
          owner,
          otherAccount,
          devName,
          appName,
          appNameLower,
          dev_uri,
          app_uri,
          specialdAppNames,
        } = await loadFixture(deployNFTsFixture);

        await basicMintDone(
          devNFT,
          appNFT,
          dev_uri,
          app_uri,
          devName,
          appName,
          appNameLower
        );
        await devNFT
          .connect(otherAccount)
          .safeMintDevNFT(otherAccount.address, dev_uri, devName.otherAccount);

        await appNFT.setCheckDappNamesListFlag(false);
        await expect(
          appNFT
            .connect(otherAccount)
            .safeMintAppNFT(otherAccount.address, app_uri, specialdAppNames[1])
        ).not.to.be.reverted;
        expect(await appNFT.tokensName(3)).to.equal(`${specialdAppNames[1]}`);
      });

      it("Should revert if appname has subdomain", async function () {
        const {
          devNFT,
          appNFT,
          owner,
          otherAccount,
          devName,
          appName,
          appNameLower,
          dev_uri,
          app_uri,
          specialdAppNames,
        } = await loadFixture(deployNFTsFixture);

        await basicMintDone(
          devNFT,
          appNFT,
          dev_uri,
          app_uri,
          devName,
          appName,
          appNameLower
        );

        await expect(
          appNFT
            .connect(otherAccount)
            .safeMintAppNFT(otherAccount.address, app_uri, "mint.domain")
        ).to.be.revertedWith("Error: Subdomain or space found");
      });

      it("Should convert uppercase appNames to lower case when minted with or without `.app`", async function () {
        const {
          devNFT,
          appNFT,
          owner,
          otherAccount,
          devName,
          appName,
          appNameLower,
          dev_uri,
          app_uri,
          specialdAppNames,
        } = await loadFixture(deployNFTsFixture);

        await basicMintDone(
          devNFT,
          appNFT,
          dev_uri,
          app_uri,
          devName,
          appName,
          appNameLower
        );
        await appNFT.setMintManyFlag(true);
        await expect(
          appNFT
            .connect(otherAccount)
            .safeMintAppNFT(otherAccount.address, app_uri, "MyFirstAppName")
        ).not.to.be.reverted;

        await expect(
          appNFT
            .connect(otherAccount)
            .safeMintAppNFT(otherAccount.address, app_uri, "MySecondAppName.app")
        ).not.to.be.reverted;

        await expect(await appNFT.tokensName(3)).to.equal(`myfirstappname.app`);

        await expect(await appNFT.tokensName(4)).to.equal(
          `mysecondappname.app`
        );
      });

      it("Should revert if appname has space", async function () {
        const {
          devNFT,
          appNFT,
          owner,
          otherAccount,
          devName,
          appName,
          appNameLower,
          dev_uri,
          app_uri,
          specialdAppNames,
        } = await loadFixture(deployNFTsFixture);

        await basicMintDone(
          devNFT,
          appNFT,
          dev_uri,
          app_uri,
          devName,
          appName,
          appNameLower
        );

        await expect(
          appNFT
            .connect(otherAccount)
            .safeMintAppNFT(otherAccount.address, app_uri, "mint my domain")
        ).to.be.revertedWith("Error: Subdomain or space found");
      });
    });

    describe("Events", function () {
      it("Should emit an event on safeMint", async function () {
        const { appNFT, owner, appName, appNameLower, app_uri } =
          await loadFixture(deployNFTsFixture);

        await expect(
          appNFT.safeMint(owner.address, appName.owner + app_uri, appName.owner)
        )
          .to.emit(appNFT, "Transfer")
          .withArgs(ADDRESS_ZERO, owner.address, anyValue); // We accept any value as `when` arg
      });
    });
  });

  describe("Sell .appNFT", function () {
    describe("Validations", function () {
      it("Should revert with the right error if try to buy not-on-sale NFT", async function () {
        const {
          devNFT,
          appNFT,
          otherAccount,
          devName,
          appName,
          appNameLower,
          dev_uri,
          app_uri,
        } = await loadFixture(deployNFTsFixture);

        await basicMintDone(
          devNFT,
          appNFT,
          dev_uri,
          app_uri,
          devName,
          appName,
          appNameLower
        );

        await expect(
          appNFT.connect(otherAccount).buyAppNFT(2)
        ).to.be.revertedWith("This NFT is not on sale");
      });

      it("Should revert with the right error if try to buy on-sale NFT at low value", async function () {
        const {
          devNFT,
          appNFT,
          otherAccount,
          account1,
          devName,
          appName,
          appNameLower,
          dev_uri,
          app_uri,
        } = await loadFixture(deployNFTsFixture);

        await basicMintDone(
          devNFT,
          appNFT,
          dev_uri,
          app_uri,
          devName,
          appName,
          appNameLower
        );
        const tokenID = await appNFT.tokenIdForName(
          `${appNameLower.account1}.app`
        );
        await appNFT.connect(account1).createSale(tokenID, 10000000000);
        const price = await appNFT.priceOf(tokenID);

        await expect(
          appNFT
            .connect(otherAccount)
            .buyAppNFT(2, { value: Number(price) / 2 })
        ).to.be.revertedWith("Paid less than price");
      });

      it("Shouldn't fail if token on-sale is bought", async function () {
        const {
          devNFT,
          appNFT,
          otherAccount,
          account1,
          devName,
          appName,
          appNameLower,
          dev_uri,
          app_uri,
        } = await loadFixture(deployNFTsFixture);

        await basicMintDone(
          devNFT,
          appNFT,
          dev_uri,
          app_uri,
          devName,
          appName,
          appNameLower
        );
        const tokenID = await appNFT.tokenIdForName(
          `${appNameLower.account1}.app`
        );
        await appNFT.connect(account1).createSale(tokenID, 10000000000);
        const price = await appNFT.priceOf(tokenID);

        await expect(
          appNFT.connect(otherAccount).buyAppNFT(2, { value: Number(price) })
        ).not.to.be.reverted;

        expect(await appNFT.ownerOf(tokenID)).to.equal(otherAccount.address);
      });

      it("Should revert with the right error if try to buy NFT when sale is ended", async function () {
        const {
          devNFT,
          appNFT,
          otherAccount,
          account1,
          devName,
          appName,
          appNameLower,
          dev_uri,
          app_uri,
        } = await loadFixture(deployNFTsFixture);

        await basicMintDone(
          devNFT,
          appNFT,
          dev_uri,
          app_uri,
          devName,
          appName,
          appNameLower
        );
        const tokenID = await appNFT.tokenIdForName(
          `${appNameLower.account1}.app`
        );
        await appNFT.connect(account1).createSale(tokenID, 10000000000);

        const price = await appNFT.priceOf(tokenID);
        expect(await appNFT.priceOf(tokenID)).to.equal(price);
        expect(await appNFT.onSale(tokenID)).to.equal(true);

        await appNFT.connect(account1).endSale(tokenID);
        expect(await appNFT.priceOf(tokenID)).to.equal(0);
        expect(await appNFT.onSale(tokenID)).to.equal(false);
        expect(await appNFT.ownerOf(tokenID)).to.equal(account1.address);

        await expect(
          appNFT.connect(otherAccount).buyAppNFT(2, { value: Number(price) })
        ).to.be.revertedWith("This NFT is not on sale");
      });
    });
  });

  describe("Renew .appNFT", function () {
    describe("Validations", function () {
      it("Should revert with the right error if try to renew token before expiry", async function () {
        const {
          devNFT,
          appNFT,
          otherAccount,
          account1,
          devName,
          appName,
          appNameLower,
          dev_uri,
          app_uri,
        } = await loadFixture(deployNFTsFixture);

        await basicMintDone(
          devNFT,
          appNFT,
          dev_uri,
          app_uri,
          devName,
          appName,
          appNameLower
        );
        const tokenID = await appNFT.tokenIdForName(
          `${appNameLower.account1}.app`
        );

        const renew_fees = await appNFT.renew_fees();

        await expect(
          appNFT.connect(account1).renewToken(tokenID, { value: renew_fees })
        ).to.be.revertedWith("Token is not expired yet");
      });

      it("Should revert with the right error if renew with less renew fees", async function () {
        const {
          devNFT,
          appNFT,
          otherAccount,
          account1,
          devName,
          appName,
          appNameLower,
          dev_uri,
          app_uri,
        } = await loadFixture(deployNFTsFixture);

        await basicMintDone(
          devNFT,
          appNFT,
          dev_uri,
          app_uri,
          devName,
          appName,
          appNameLower
        );
        const tokenID = await appNFT.tokenIdForName(
          `${appNameLower.account1}.app`
        );

        const token_life = await appNFT.token_life();
        await time.increase(token_life.toNumber() + 1);

        const renew_fees = await appNFT.renew_fees();

        await expect(
          appNFT
            .connect(account1)
            .renewToken(tokenID, { value: (Number(renew_fees) / 2).toString() })
        ).to.be.revertedWith("Insufficient renew fees");
      });

      it("Should revert with the right error if try to update Metadata URI after tokens life is over", async function () {
        const {
          devNFT,
          appNFT,
          account1,
          otherAccount,
          devName,
          appName,
          appNameLower,
          dev_uri,
          app_uri,
        } = await loadFixture(deployNFTsFixture);

        await basicMintDone(
          devNFT,
          appNFT,
          dev_uri,
          app_uri,
          devName,
          appName,
          appNameLower
        );
        const tokenID = await appNFT.tokenIdForName(
          `${appNameLower.account1}.app`
        );

        const token_life = await appNFT.token_life();
        await time.increase(token_life.toNumber() + 1);

        await expect(
          appNFT.connect(account1).updateTokenURI(tokenID, "newURI")
        ).to.be.revertedWith("Cant continue, Name Token Expired");
      });

      it("Shouldn't fail if token is renewed after expiry providing sufficient renew fees", async function () {
        const {
          devNFT,
          appNFT,
          otherAccount,
          account1,
          devName,
          appName,
          appNameLower,
          dev_uri,
          app_uri,
        } = await loadFixture(deployNFTsFixture);

        await basicMintDone(
          devNFT,
          appNFT,
          dev_uri,
          app_uri,
          devName,
          appName,
          appNameLower
        );
        const tokenID = await appNFT.tokenIdForName(
          `${appNameLower.account1}.app`
        );

        const token_life = await appNFT.token_life();
        await time.increase(token_life.toNumber() + 1);

        const renew_fees = await appNFT.renew_fees();

        await expect(
          appNFT.connect(account1).renewToken(tokenID, { value: renew_fees })
        ).not.to.be.reverted;

        await expect(appNFT.connect(account1).updateTokenURI(tokenID, "newURI"))
          .not.to.be.reverted;
      });

      it("Should revert with the right error if non owner try claim token within renew life(grace period)", async function () {
        const {
          devNFT,
          appNFT,
          otherAccount,
          account1,
          devName,
          appName,
          appNameLower,
          dev_uri,
          app_uri,
        } = await loadFixture(deployNFTsFixture);

        await basicMintDone(
          devNFT,
          appNFT,
          dev_uri,
          app_uri,
          devName,
          appName,
          appNameLower
        );
        const tokenID = await appNFT.tokenIdForName(
          `${appNameLower.account1}.app`
        );

        const token_life = await appNFT.token_life();
        await time.increase(token_life.toNumber() + 1);

        const renew_fees = await appNFT.renew_fees();

        await expect(
          appNFT
            .connect(otherAccount)
            .claimToken(tokenID, { value: renew_fees })
        ).to.be.revertedWith("Token not available for claiming yet");
      });

      it("Should revert with the right error if non owner renew with less renew fees", async function () {
        const {
          devNFT,
          appNFT,
          otherAccount,
          account1,
          devName,
          appName,
          appNameLower,
          dev_uri,
          app_uri,
        } = await loadFixture(deployNFTsFixture);

        await basicMintDone(
          devNFT,
          appNFT,
          dev_uri,
          app_uri,
          devName,
          appName,
          appNameLower
        );
        const tokenID = await appNFT.tokenIdForName(
          `${appNameLower.account1}.app`
        );

        const token_life = await appNFT.token_life();
        const renew_life = await appNFT.renew_life();
        await time.increase(token_life.toNumber() + renew_life.toNumber() + 1);

        const renew_fees = await appNFT.renew_fees();

        await expect(
          appNFT
            .connect(otherAccount)
            .claimToken(tokenID, { value: (Number(renew_fees) / 2).toString() })
        ).to.be.revertedWith("Insufficient renew fees");
      });

      it("Shouldn't fail if token is renewed by non owner after expiry+renew period providing sufficient renew fees", async function () {
        const {
          devNFT,
          appNFT,
          otherAccount,
          account1,
          devName,
          appName,
          appNameLower,
          dev_uri,
          app_uri,
        } = await loadFixture(deployNFTsFixture);

        await basicMintDone(
          devNFT,
          appNFT,
          dev_uri,
          app_uri,
          devName,
          appName,
          appNameLower
        );
        const tokenID = await appNFT.tokenIdForName(
          `${appNameLower.account1}.app`
        );

        const token_life = await appNFT.token_life();
        const renew_life = await appNFT.renew_life();
        await time.increase(token_life.toNumber() + renew_life.toNumber() + 1);

        const renew_fees = await appNFT.renew_fees();

        await expect(
          appNFT
            .connect(otherAccount)
            .claimToken(tokenID, { value: renew_fees })
        ).not.to.be.reverted;

        expect(await appNFT.ownerOf(tokenID)).to.equal(otherAccount.address);
      });
    });
  });
});
