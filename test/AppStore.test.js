const {
  time,
  loadFixture,
} = require("@nomicfoundation/hardhat-network-helpers");
const { anyValue } = require("@nomicfoundation/hardhat-chai-matchers/withArgs");
const { expect } = require("chai");
const ADDRESS_ZERO = "0x0000000000000000000000000000000000000000";
const blockedDappNames = require("../scripts/backend/appNames.json");
require("dotenv");
describe(".appStore minting", function () {
  // We define a fixture to reuse the same setup in every test.
  // We use loadFixture to run this setup once, snapshot that state,
  // and reset Hardhat Network to that snapshot in every test.
  async function deployNFTsFixture() {
    const ONE_YEAR_IN_SECS = 365 * 24 * 60 * 60;
    const ONE_GWEI = 1_000_000_000;

    const lockedAmount = ONE_GWEI;
    const unlockTime = (await time.latest()) + ONE_YEAR_IN_SECS;
    const symbolOfAppStoreNFT = "MerokuAppStore";
    const nameOfAppStoreNFT = "MerokuAppStore";

    // Contracts are deployed using the first signer/account by default
    const [owner, account1, account2, otherAccount] = await ethers.getSigners();

    const specialdAppNames = ["dappStore.appStore", "playstore.appStore", "appstore.appStore"];
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


    const appStoreName = {
      owner: "ownerAppStoreName",
      account1: "account1AppStoreName",
      account2: "account2AppStoreName",
      otherAccount: "otherAccountAppStoreName",
    };
    const appStoreNameLower = {
      owner: "ownerappstorename",
      account1: "account1appstorename",
      account2: "account2appstorename",
      otherAccount: "otheraccountappstorename",
    };
    const appStore_uri = ".appStoreNFT.com";

    const AppStoreNFT = await ethers.getContractFactory("AppStoreNFTUpgradeable");
    const appStoreNFT = await upgrades.deployProxy(AppStoreNFT, [
      devNFT.address,
      dappNameList.address,
      process.env.TRUSTED_FORWARDER_ADDRESS,
    ]);
    await appStoreNFT.deployed();
    await appStoreNFT.setPayForMintFlag(false);

    return {
      appStoreNFT,
      dappNameList,
      symbolOfAppStoreNFT,
      nameOfAppStoreNFT,
      owner,
      account1,
      account2,
      otherAccount,
      appStoreName,
      appStoreNameLower,
      appStore_uri,
      specialdAppNames,
    };
  }

  async function basicMintDone(
    appStoreNFT,
    app_uri,
    appName,
    appNameLower
  ) {
    const [owner, account1, account2, otherAccount] = await ethers.getSigners();

    await appStoreNFT.safeMintAppStoreNFT(owner.address, app_uri, appName.owner);
    await appStoreNFT
      .connect(account1)
      .safeMintAppStoreNFT(account1.address, app_uri, appName.account1);
  }

  describe("Deployment", function () {

    it("Should give the right name and symbol of AppStore NFT", async function () {
      const { appStoreNFT, symbolOfAppStoreNFT, nameOfAppStoreNFT } = await loadFixture(
        deployNFTsFixture
      );

      expect(await appStoreNFT.name()).to.equal(symbolOfAppStoreNFT);
      expect(await appStoreNFT.symbol()).to.equal(nameOfAppStoreNFT);
    });

    it("Should set the right owner appStoreNFT", async function () {
      const { appStoreNFT, owner } = await loadFixture(deployNFTsFixture);

      expect(await appStoreNFT.owner()).to.equal(owner.address);
    });

    it("Should set the right owner dappNameList", async function () {
      const { dappNameList, owner } = await loadFixture(deployNFTsFixture);

      expect(await dappNameList.owner()).to.equal(owner.address);
    });
  });

  describe("Mint .appStoreNFT", function () {
    describe("Validations", function () {
      it("Should revert with the right error if called from non-owner account in safeMint", async function () {
        const { appStoreNFT, otherAccount, appStoreName, appStoreNameLower, appStore_uri } =
          await loadFixture(deployNFTsFixture);

        await expect(
          appStoreNFT
            .connect(otherAccount)
            .safeMint(
              otherAccount.address,
              appStoreName.otherAccount + appStore_uri,
              appStoreName.otherAccount
            )
        ).to.be.revertedWith("Ownable: caller is not the owner");
      });

      it("Shouldn't fail safeMint call if the owner calls it", async function () {
        const { appStoreNFT, owner, appStoreName, appStoreNameLower, appStore_uri } =
          await loadFixture(deployNFTsFixture);
        await expect(
          appStoreNFT.safeMint(owner.address, appStoreName.owner + appStore_uri, appStoreName.owner)
        ).not.to.be.reverted;
      });


      it("Should revert with the right error if more than 1 appStoreName is minted by same user", async function () {
        const {
          appStoreNFT,
          account1,
          appStoreName,
          appStoreNameLower,
          appStore_uri,
        } = await loadFixture(deployNFTsFixture);

        await expect(
          appStoreNFT
            .connect(account1)
            .safeMintAppStoreNFT(account1.address, appStore_uri, appStoreName.account1)
        );
        await expect(
          appStoreNFT
            .connect(account1)
            .safeMintAppStoreNFT(account1.address, appStore_uri, appStoreName.account1)
        ).to.be.revertedWith("provided wallet already used to create appStore");
      });

      it("Shouldn't fail safeMintAppStoreNFT call if more than 1 appName is minted by same user when mintManyFlag is turned true by owner", async function () {
        const {
          appStoreNFT,
          account1,
          appStoreName,
          appStoreNameLower,
          appStore_uri,
        } = await loadFixture(deployNFTsFixture);

        await appStoreNFT.setMintManyFlag(true);
        await expect(
          appStoreNFT
            .connect(account1)
            .safeMintAppStoreNFT(account1.address, appStore_uri, appStoreName.account1)
        );

        await expect(
          appStoreNFT
            .connect(account1)
            .safeMintAppStoreNFT(account1.address, appStore_uri, "secondName")
        ).not.to.be.reverted;
        expect(await appStoreNFT.tokensName(1)).to.equal(
          `${appStoreNameLower.account1}.appStore`
        );
        expect(await appStoreNFT.tokensName(2)).to.equal("secondname.appStore");
      });
    });

    describe("appStoreName validations", function () {
      it("Should revert when the appStoreName is already in use", async function () {
        const {
          appStoreNFT,
          owner,
          otherAccount,
          appStoreName,
          appStoreNameLower,
          appStore_uri,
        } = await loadFixture(deployNFTsFixture);

        await basicMintDone(
          appStoreNFT,
          appStore_uri,
          appStoreName,
          appStoreNameLower
        );

        await expect(
          appStoreNFT
            .connect(otherAccount)
            .safeMintAppStoreNFT(otherAccount.address, appStore_uri, appStoreName.owner)
        ).to.be.revertedWith("ERC721NameStorage: this Name already in use");
      });

      it("Should revert when the appStoreName's special ie length is less than equal to 3", async function () {
        const {
          appStoreNFT,
          owner,
          otherAccount,
          appStoreName,
          appStoreNameLower,
          appStore_uri,
        } = await loadFixture(deployNFTsFixture);

        await basicMintDone(
          appStoreNFT,
          appStore_uri,
          appStoreName,
          appStoreNameLower
        );
        await expect(
          appStoreNFT
            .connect(otherAccount)
            .safeMintAppStoreNFT(otherAccount.address, appStore_uri, "XX")
        ).to.be.revertedWith("Minting of such names is restricted currently");
      });

      it("Should'nt fail when user mints special appNames when mintSpecialFlag is turned true by owner", async function () {
        const {
          appStoreNFT,
          owner,
          otherAccount,
          appStoreName,
          appStoreNameLower,
          appStore_uri,
        } = await loadFixture(deployNFTsFixture);

        await basicMintDone(
          appStoreNFT,
          appStore_uri,
          appStoreName,
          appStoreNameLower
        );
        await appStoreNFT.setMintSpecialFlag(true);
        await expect(
          appStoreNFT
            .connect(otherAccount)
            .safeMintAppStoreNFT(otherAccount.address, appStore_uri, "XX")
        ).not.to.be.reverted;
        expect(await appStoreNFT.tokensName(3)).to.equal("xx.appStore");
      });

      it("Should revert when the appName's blacklisted ie present in dappNameList", async function () {
        const {
          appStoreNFT,
          dappNameList,
          owner,
          otherAccount,
          appStoreName,
          appStoreNameLower,
          appStore_uri,
          specialdAppNames,
        } = await loadFixture(deployNFTsFixture);

        await expect(
          appStoreNFT
            .connect(otherAccount)
            .safeMintAppStoreNFT(otherAccount.address, appStore_uri, specialdAppNames[1])
        ).to.be.revertedWith("AppStore name reserved");
      });

      it("Should'nt fail when user mints special appNames when mintSpecialFlag is turned off by owner", async function () {
        const {
          appStoreNFT,
          owner,
          otherAccount,
          appStoreName,
          appStoreNameLower,
          appStore_uri,
          specialdAppNames,
        } = await loadFixture(deployNFTsFixture);

        await basicMintDone(
          appStoreNFT,
          appStore_uri,
          appStoreName,
          appStoreNameLower
        );
        await appStoreNFT.setCheckDappNamesListFlag(false);
        await expect(
          appStoreNFT
            .connect(otherAccount)
            .safeMintAppStoreNFT(otherAccount.address, appStore_uri, specialdAppNames[1])
        ).not.to.be.reverted;
        expect(await appStoreNFT.tokensName(3)).to.equal(`${specialdAppNames[1]}`);
      });

      it("Should revert if appStorename has subdomain", async function () {
        const {
          appStoreNFT,
          owner,
          otherAccount,
          appStoreName,
          appStoreNameLower,
          appStore_uri,
          specialdAppNames,
        } = await loadFixture(deployNFTsFixture);

        await basicMintDone(
          appStoreNFT,
          appStore_uri,
          appStoreName,
          appStoreNameLower
        );

        await expect(
          appStoreNFT
            .connect(otherAccount)
            .safeMintAppStoreNFT(otherAccount.address, appStore_uri, "mint.domain")
        ).to.be.revertedWith("Error: Subdomain or space found");
      });

      it("Should convert uppercase appStoreNames to lower case when minted with or without `.appStore`", async function () {
        const {
          appStoreNFT,
          owner,
          otherAccount,
          appStoreName,
          appStoreNameLower,
          appStore_uri,
          specialdAppNames,
        } = await loadFixture(deployNFTsFixture);

        await basicMintDone(
          appStoreNFT,
          appStore_uri,
          appStoreName,
          appStoreNameLower
        );
        await appStoreNFT.setMintManyFlag(true);
        await expect(
          appStoreNFT
            .connect(otherAccount)
            .safeMintAppStoreNFT(otherAccount.address, appStore_uri, "MyFirstAppStoreName")
        ).not.to.be.reverted;

        await expect(
          appStoreNFT
            .connect(otherAccount)
            .safeMintAppStoreNFT(otherAccount.address, appStore_uri, "MySecondAppStoreName.appStore")
        ).not.to.be.reverted;

        await expect(await appStoreNFT.tokensName(3)).to.equal(`myfirstappstorename.appStore`);

        await expect(await appStoreNFT.tokensName(4)).to.equal(
          `mysecondappstorename.appStore`
        );
      });

      it("Should revert if appStore name has space", async function () {
        const {
          appStoreNFT,
          owner,
          otherAccount,
          appStoreName,
          appStoreNameLower,
          appStore_uri,
          specialdAppNames,
        } = await loadFixture(deployNFTsFixture);

        await basicMintDone(
          appStoreNFT,
          appStore_uri,
          appStoreName,
          appStoreNameLower
        );

        await expect(
          appStoreNFT
            .connect(otherAccount)
            .safeMintAppStoreNFT(otherAccount.address, appStore_uri, "mint my domain")
        ).to.be.revertedWith("Error: Subdomain or space found");
      });
    });

    describe("Events", function () {
      it("Should emit an event on safeMint", async function () {
        const { appStoreNFT, owner, appStoreName, appStoreNameLower, appStore_uri } =
          await loadFixture(deployNFTsFixture);

        await expect(
          appStoreNFT.safeMint(owner.address, appStoreName.owner + appStore_uri, appStoreName.owner)
        )
          .to.emit(appStoreNFT, "Transfer")
          .withArgs(ADDRESS_ZERO, owner.address, anyValue); // We accept any value as `when` arg
      });
    });
  });

  describe("Sell .appStoreNFT", function () {
    describe("Validations", function () {
      it("Should revert with the right error if try to buy not-on-sale NFT", async function () {
        const {
          appStoreNFT,
          otherAccount,
          appStoreName,
          appStoreNameLower,
          appStore_uri,
        } = await loadFixture(deployNFTsFixture);

        await basicMintDone(
          appStoreNFT,
          appStore_uri,
          appStoreName,
          appStoreNameLower
        );

        await expect(
          appStoreNFT.connect(otherAccount).buyAppStoreNFT(2)
        ).to.be.revertedWith("This NFT is not on sale");
      });

      it("Should revert with the right error if try to buy on-sale NFT at low value", async function () {
        const {
          appStoreNFT,
          otherAccount,
          account1,
          appStoreName,
          appStoreNameLower,
          appStore_uri,
        } = await loadFixture(deployNFTsFixture);

        await basicMintDone(
          appStoreNFT,
          appStore_uri,
          appStoreName,
          appStoreNameLower
        );
        const tokenID = await appStoreNFT.tokenIdForName(
          `${appStoreNameLower.account1}.appStore`
        );
        await appStoreNFT.connect(account1).createSale(tokenID, 10000000000);
        const price = await appStoreNFT.priceOf(tokenID);

        await expect(
          appStoreNFT
            .connect(otherAccount)
            .buyAppStoreNFT(2, { value: Number(price) / 2 })
        ).to.be.revertedWith("Paid less than price");
      });

      it("Shouldn't fail if token on-sale is bought", async function () {
        const {
          appStoreNFT,
          otherAccount,
          account1,
          appStoreName,
          appStoreNameLower,
          appStore_uri,
        } = await loadFixture(deployNFTsFixture);

        await basicMintDone(
          appStoreNFT,
          appStore_uri,
          appStoreName,
          appStoreNameLower
        );
        const tokenID = await appStoreNFT.tokenIdForName(
          `${appStoreNameLower.account1}.appStore`
        );
        await appStoreNFT.connect(account1).createSale(tokenID, 10000000000);
        const price = await appStoreNFT.priceOf(tokenID);

        await expect(
          appStoreNFT.connect(otherAccount).buyAppStoreNFT(2, { value: Number(price) })
        ).not.to.be.reverted;

        expect(await appStoreNFT.ownerOf(tokenID)).to.equal(otherAccount.address);
      });

      it("Should revert with the right error if try to buy NFT when sale is ended", async function () {
        const {
          appStoreNFT,
          otherAccount,
          account1,
          appStoreName,
          appStoreNameLower,
          appStore_uri,
        } = await loadFixture(deployNFTsFixture);

        await basicMintDone(
          appStoreNFT,
          appStore_uri,
          appStoreName,
          appStoreNameLower
        );
        const tokenID = await appStoreNFT.tokenIdForName(
          `${appStoreNameLower.account1}.appStore`
        );
        await appStoreNFT.connect(account1).createSale(tokenID, 10000000000);

        const price = await appStoreNFT.priceOf(tokenID);
        expect(await appStoreNFT.priceOf(tokenID)).to.equal(price);
        expect(await appStoreNFT.onSale(tokenID)).to.equal(true);

        await appStoreNFT.connect(account1).endSale(tokenID);
        expect(await appStoreNFT.priceOf(tokenID)).to.equal(0);
        expect(await appStoreNFT.onSale(tokenID)).to.equal(false);
        expect(await appStoreNFT.ownerOf(tokenID)).to.equal(account1.address);

        await expect(
          appStoreNFT.connect(otherAccount).buyAppStoreNFT(2, { value: Number(price) })
        ).to.be.revertedWith("This NFT is not on sale");
      });
    });
  });

  describe("Renew .appStoreNFT", function () {
    describe("Validations", function () {
      it("Should revert with the right error if try to renew token before expiry", async function () {
        const {
          appStoreNFT,
          otherAccount,
          account1,
          appStoreName,
          appStoreNameLower,
          appStore_uri,
        } = await loadFixture(deployNFTsFixture);

        await basicMintDone(
          appStoreNFT,
          appStore_uri,
          appStoreName,
          appStoreNameLower
        );
        const tokenID = await appStoreNFT.tokenIdForName(
          `${appStoreNameLower.account1}.appStore`
        );

        const renew_fees = await appStoreNFT.renew_fees();

        await expect(
          appStoreNFT.connect(account1).renewToken(tokenID, { value: renew_fees })
        ).to.be.revertedWith("Token is not expired yet");
      });

      it("Should revert with the right error if renew with less renew fees", async function () {
        const {
          appStoreNFT,
          otherAccount,
          account1,
          appStoreName,
          appStoreNameLower,
          appStore_uri,
        } = await loadFixture(deployNFTsFixture);

        await basicMintDone(
          appStoreNFT,
          appStore_uri,
          appStoreName,
          appStoreNameLower
        );
        const tokenID = await appStoreNFT.tokenIdForName(
          `${appStoreNameLower.account1}.appStore`
        );

        const token_life = await appStoreNFT.token_life();
        await time.increase(token_life.toNumber() + 1);

        const renew_fees = await appStoreNFT.renew_fees();

        await expect(
          appStoreNFT
            .connect(account1)
            .renewToken(tokenID, { value: (Number(renew_fees) / 2).toString() })
        ).to.be.revertedWith("Insufficient renew fees");
      });

      it("Should revert with the right error if try to update Metadata URI after tokens life is over", async function () {
        const {
          appStoreNFT,
          account1,
          otherAccount,
          appStoreName,
          appStoreNameLower,
          appStore_uri,
        } = await loadFixture(deployNFTsFixture);

        await basicMintDone(
          appStoreNFT,
          appStore_uri,
          appStoreName,
          appStoreNameLower
        );
        const tokenID = await appStoreNFT.tokenIdForName(
          `${appStoreNameLower.account1}.appStore`
        );

        const token_life = await appStoreNFT.token_life();
        await time.increase(token_life.toNumber() + 1);

        await expect(
          appStoreNFT.connect(account1).updateTokenURI(tokenID, "newURI")
        ).to.be.revertedWith("Cant continue, Name Token Expired");
      });

      it("Shouldn't fail if token is renewed after expiry providing sufficient renew fees", async function () {
        const {
          appStoreNFT,
          otherAccount,
          account1,
          appStoreName,
          appStoreNameLower,
          appStore_uri,
        } = await loadFixture(deployNFTsFixture);

        await basicMintDone(
          appStoreNFT,
          appStore_uri,
          appStoreName,
          appStoreNameLower
        );
        const tokenID = await appStoreNFT.tokenIdForName(
          `${appStoreNameLower.account1}.appStore`
        );

        const token_life = await appStoreNFT.token_life();
        await time.increase(token_life.toNumber() + 1);

        const renew_fees = await appStoreNFT.renew_fees();

        await expect(
          appStoreNFT.connect(account1).renewToken(tokenID, { value: renew_fees })
        ).not.to.be.reverted;

        await expect(appStoreNFT.connect(account1).updateTokenURI(tokenID, "newURI"))
          .not.to.be.reverted;
      });

      it("Should revert with the right error if non owner try claim token within renew life(grace period)", async function () {
        const {
          appStoreNFT,
          otherAccount,
          account1,
          appStoreName,
          appStoreNameLower,
          appStore_uri,
        } = await loadFixture(deployNFTsFixture);

        await basicMintDone(
          appStoreNFT,
          appStore_uri,
          appStoreName,
          appStoreNameLower
        );
        const tokenID = await appStoreNFT.tokenIdForName(
          `${appStoreNameLower.account1}.appStore`
        );

        const token_life = await appStoreNFT.token_life();
        await time.increase(token_life.toNumber() + 1);

        const renew_fees = await appStoreNFT.renew_fees();

        await expect(
          appStoreNFT
            .connect(otherAccount)
            .claimToken(tokenID, { value: renew_fees })
        ).to.be.revertedWith("Token not available for claiming yet");
      });

      it("Should revert with the right error if non owner renew with less renew fees", async function () {
        const {
          appStoreNFT,
          otherAccount,
          account1,
          appStoreName,
          appStoreNameLower,
          appStore_uri,
        } = await loadFixture(deployNFTsFixture);

        await basicMintDone(
          appStoreNFT,
          appStore_uri,
          appStoreName,
          appStoreNameLower
        );
        const tokenID = await appStoreNFT.tokenIdForName(
          `${appStoreNameLower.account1}.appStore`
        );

        const token_life = await appStoreNFT.token_life();
        const renew_life = await appStoreNFT.renew_life();
        await time.increase(token_life.toNumber() + renew_life.toNumber() + 1);

        const renew_fees = await appStoreNFT.renew_fees();

        await expect(
          appStoreNFT
            .connect(otherAccount)
            .claimToken(tokenID, { value: (Number(renew_fees) / 2).toString() })
        ).to.be.revertedWith("Insufficient renew fees");
      });

      it("Shouldn't fail if token is renewed by non owner after expiry+renew period providing sufficient renew fees", async function () {
        const {
          appStoreNFT,
          otherAccount,
          account1,
          appStoreName,
          appStoreNameLower,
          appStore_uri,
        } = await loadFixture(deployNFTsFixture);

        await basicMintDone(
          appStoreNFT,
          appStore_uri,
          appStoreName,
          appStoreNameLower
        );
        const tokenID = await appStoreNFT.tokenIdForName(
          `${appStoreNameLower.account1}.appStore`
        );

        const token_life = await appStoreNFT.token_life();
        const renew_life = await appStoreNFT.renew_life();
        await time.increase(token_life.toNumber() + renew_life.toNumber() + 1);

        const renew_fees = await appStoreNFT.renew_fees();

        await expect(
          appStoreNFT
            .connect(otherAccount)
            .claimToken(tokenID, { value: renew_fees })
        ).not.to.be.reverted;

        expect(await appStoreNFT.ownerOf(tokenID)).to.equal(otherAccount.address);
      });
    });
  });
});
