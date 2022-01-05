const { expect } = require("chai");
const { waffle, network } = require("hardhat");
const { loadFixture } = waffle;

const WHITELIST = require("../scripts/whitelist.json");

const COLLECTION_NAME = process.env.COLLECTION_NAME;
const TOKEN_NAME = process.env.TOKEN_NAME;
const METADATA_URI = process.env.METADATA_URI;
const DAO_ADDRESS = process.env.DAO_ADDRESS;
const MINT_PRICE = ethers.utils.parseEther(process.env.MINT_PRICE);
const SHARDED_MINDS_SUPPLY = 100;
const BULK_BUY_LIMIT = process.env.BULK_BUY_LIMIT;
const MAX_NFTS_PER_WALLET = process.env.MAX_NFTS_PER_WALLET;
const MAX_NFTS_PER_WALLET_PRESALE = process.env.MAX_NFTS_PER_WALLET_PRESALE;
const PRESALE_START = Math.round(new Date().getTime() / 1000);
const OFFICIAL_SALE_START = PRESALE_START + 7200;

describe("ShardedMinds Tests", () => {
  async function deployContract() {
    const accounts = await ethers.getSigners();
    const ShardedMinds = await ethers.getContractFactory("ShardedMindsTest");

    const shardedMindsDeployment = await ShardedMinds.deploy(
      COLLECTION_NAME,
      TOKEN_NAME,
      METADATA_URI,
      DAO_ADDRESS,
      MINT_PRICE,
      SHARDED_MINDS_SUPPLY,
      BULK_BUY_LIMIT,
      MAX_NFTS_PER_WALLET,
      MAX_NFTS_PER_WALLET_PRESALE,
      PRESALE_START,
      OFFICIAL_SALE_START
    );

    const whitelistAddresses = [];
    for (let i = 1; i <= 50; i++) {
      whitelistAddresses.push(accounts[i].address);
    }

    return { shardedMindsDeployment, whitelistAddresses };
  }

  it("Should initialize properly with correct configuration and whitelist addresses", async () => {
    const { shardedMindsDeployment, whitelistAddresses } = await loadFixture(deployContract);
    const accounts = await ethers.getSigners();

    await shardedMindsDeployment.addToPresaleList(whitelistAddresses);

    expect(await shardedMindsDeployment.name()).to.equal(COLLECTION_NAME);
    expect(await shardedMindsDeployment.symbol()).to.equal(TOKEN_NAME);

    expect(await shardedMindsDeployment.isInPresaleWhitelist(whitelistAddresses[0])).to.be.true;
    expect(await shardedMindsDeployment.isInPresaleWhitelist(whitelistAddresses[49])).to.be.true;
    expect(await shardedMindsDeployment.isInPresaleWhitelist(accounts[0].address)).to.be.false;
  });

  it("Should generate random unique tokens", async () => {
    const { shardedMindsDeployment } = await loadFixture(deployContract);

    let uniquesCount = 7;
    let generatedUniquesCount = await shardedMindsDeployment.generatedUniquesCount();

    expect(uniquesCount).to.equal(generatedUniquesCount);
  });

  it("Non whitelisted addresses should not mint during presale", async () => {
    const { shardedMindsDeployment, whitelistAddresses } = await loadFixture(deployContract);
    const accounts = await ethers.getSigners();

    await shardedMindsDeployment.addToPresaleList(whitelistAddresses);

    await expect(
      shardedMindsDeployment.connect(accounts[0]).functions["presaleMint(uint256)"](MAX_NFTS_PER_WALLET_PRESALE, {
        value: MINT_PRICE.mul(MAX_NFTS_PER_WALLET_PRESALE),
      })
    ).revertedWith("Not in presale list");
  });

  it("Only whitelisted addresses should mint during presale", async () => {
    const { shardedMindsDeployment, whitelistAddresses } = await loadFixture(deployContract);
    const accounts = await ethers.getSigners();

    await shardedMindsDeployment.addToPresaleList(whitelistAddresses);

    await expect(
      shardedMindsDeployment.connect(accounts[0]).functions["presaleMint(uint256)"](MAX_NFTS_PER_WALLET_PRESALE, {
        value:  MINT_PRICE.mul(MAX_NFTS_PER_WALLET_PRESALE),
      })
    ).revertedWith("Not in presale list");

    await expect(
      shardedMindsDeployment.connect(accounts[1]).functions["presaleMint(uint256)"](MAX_NFTS_PER_WALLET_PRESALE, {
        value:  MINT_PRICE.mul(MAX_NFTS_PER_WALLET_PRESALE),
      })
    ).to.be.emit(shardedMindsDeployment, "TokenMinted");

    await expect(
      shardedMindsDeployment.connect(accounts[1]).functions["presaleMint(uint256)"](MAX_NFTS_PER_WALLET_PRESALE, {
        value:  MINT_PRICE.mul(MAX_NFTS_PER_WALLET_PRESALE),
      })
    ).revertedWith("Presale mint limit exceeded");
  });

  it("Max 2 NFTs can be minted during presale", async () => {
    const { shardedMindsDeployment, whitelistAddresses } = await loadFixture(deployContract);
    const accounts = await ethers.getSigners();

    await shardedMindsDeployment.addToPresaleList(whitelistAddresses);

    await expect(
      shardedMindsDeployment.connect(accounts[1]).functions["presaleMint(uint256)"](MAX_NFTS_PER_WALLET_PRESALE, {
        value:  MINT_PRICE.mul(MAX_NFTS_PER_WALLET_PRESALE),
      })
    ).to.be.emit(shardedMindsDeployment, "TokenMinted");

    await expect(
      shardedMindsDeployment.connect(accounts[1]).functions["presaleMint(uint256)"](MAX_NFTS_PER_WALLET_PRESALE, {
        value:  MINT_PRICE.mul(MAX_NFTS_PER_WALLET_PRESALE),
      })
    ).revertedWith("Presale mint limit exceeded");
  });

  it("Only owner can mint reserved tokens during presale, up to the limit", async () => {
    const { shardedMindsDeployment, whitelistAddresses } = await loadFixture(deployContract);
    const accounts = await ethers.getSigners();

    await shardedMindsDeployment.addToPresaleList(whitelistAddresses);

    await expect(
      shardedMindsDeployment.connect(accounts[0]).functions["reserveMint(uint256)"](50)
    ).to.be.emit(shardedMindsDeployment, "TokenMinted");

    await expect(
      shardedMindsDeployment.connect(accounts[1]).functions["reserveMint(uint256)"](1)
    ).revertedWith("Ownable: caller is not the owner");

    await expect(
      shardedMindsDeployment.connect(accounts[0]).functions["reserveMint(uint256)"](1)
    ).revertedWith("Mint limit exceeded");
  });

  it("Owner cannot mint reserved tokens during official sale", async () => {
    const { shardedMindsDeployment, whitelistAddresses } = await loadFixture(deployContract);
    const accounts = await ethers.getSigners();

    await shardedMindsDeployment.addToPresaleList(whitelistAddresses);

    await ethers.provider.send('evm_setNextBlockTimestamp', [OFFICIAL_SALE_START]); 
    await ethers.provider.send('evm_mine');

    await expect(
      shardedMindsDeployment.connect(accounts[0]).functions["reserveMint(uint256)"](1)
    ).revertedWith("Presale not started/already finished");
  });

  it("Max 10 NFTs for non-whitelisted wallet can be minted during official sale", async () => {
    const { shardedMindsDeployment, whitelistAddresses } = await loadFixture(deployContract);
    const accounts = await ethers.getSigners();

    await shardedMindsDeployment.addToPresaleList(whitelistAddresses);

    await ethers.provider.send('evm_setNextBlockTimestamp', [OFFICIAL_SALE_START]); 
    await ethers.provider.send('evm_mine');

    await expect(
      shardedMindsDeployment.connect(accounts[51]).functions["bulkBuy(uint256)"](MAX_NFTS_PER_WALLET, {
        value: MINT_PRICE.mul(MAX_NFTS_PER_WALLET),
      })
    ).to.be.emit(shardedMindsDeployment, "TokenMinted");

    await expect(
      shardedMindsDeployment.connect(accounts[51]).functions["bulkBuy(uint256)"](1, {
        value: MINT_PRICE.mul(1),
      })
    ).revertedWith("Mint limit exceeded");
  });

  it("Max 12 NFTs for whitelisted wallet can be minted during presale and official sale", async () => {
    const { shardedMindsDeployment, whitelistAddresses } = await loadFixture(deployContract);
    const accounts = await ethers.getSigners();

    await shardedMindsDeployment.addToPresaleList(whitelistAddresses);

    await expect(
      shardedMindsDeployment.connect(accounts[1]).functions["presaleMint(uint256)"](MAX_NFTS_PER_WALLET_PRESALE, {
        value: MINT_PRICE.mul(MAX_NFTS_PER_WALLET_PRESALE),
      })
    ).to.be.emit(shardedMindsDeployment, "TokenMinted");

    await ethers.provider.send('evm_setNextBlockTimestamp', [OFFICIAL_SALE_START]); 
    await ethers.provider.send('evm_mine');

    await expect(
      shardedMindsDeployment.connect(accounts[1]).functions["bulkBuy(uint256)"](MAX_NFTS_PER_WALLET, {
        value: MINT_PRICE.mul(MAX_NFTS_PER_WALLET),
      })
    ).to.be.emit(shardedMindsDeployment, "TokenMinted");

    await expect(
      shardedMindsDeployment.connect(accounts[1]).functions["bulkBuy(uint256)"](1, {
        value: MINT_PRICE.mul(1),
      })
    ).revertedWith("Mint limit exceeded");
  });

  it("Bulk buy should mint max 10 NFTs in one call", async () => {
    const { shardedMindsDeployment, whitelistAddresses } = await loadFixture(deployContract);
    const accounts = await ethers.getSigners();

    await shardedMindsDeployment.addToPresaleList(whitelistAddresses);

    await ethers.provider.send('evm_setNextBlockTimestamp', [OFFICIAL_SALE_START]); 
    await ethers.provider.send('evm_mine');

    await expect(
      shardedMindsDeployment.connect(accounts[51]).functions["bulkBuy(uint256)"]((BULK_BUY_LIMIT + 1), {
        value: MINT_PRICE.mul((BULK_BUY_LIMIT + 1)),
      })
    ).revertedWith("Cannot bulk buy more than the preset limit");
  });

  it("Should not be able to bulk buy if max total supply is reached", async () => {
    const { shardedMindsDeployment, whitelistAddresses } = await loadFixture(deployContract);
    const accounts = await ethers.getSigners();

    await shardedMindsDeployment.addToPresaleList(whitelistAddresses);

    await ethers.provider.send('evm_setNextBlockTimestamp', [OFFICIAL_SALE_START]); 
    await ethers.provider.send('evm_mine');

    for (let i = 0; i < (SHARDED_MINDS_SUPPLY / BULK_BUY_LIMIT); i++) {
      await shardedMindsDeployment.connect(accounts[50 + i]).functions["bulkBuy(uint256)"](BULK_BUY_LIMIT, {
        value: MINT_PRICE.mul(BULK_BUY_LIMIT),
      })
    }

    await expect(
      shardedMindsDeployment.connect(accounts[75]).functions["bulkBuy(uint256)"](1, {
        value: MINT_PRICE.mul(1),
      })
    ).revertedWith("Total supply reached");

  });

  it("Should not be able to single mint if max total supply is reached", async () => {
    const { shardedMindsDeployment, whitelistAddresses } = await loadFixture(deployContract);
    const accounts = await ethers.getSigners();

    await shardedMindsDeployment.addToPresaleList(whitelistAddresses);

    await ethers.provider.send('evm_setNextBlockTimestamp', [OFFICIAL_SALE_START]); 
    await ethers.provider.send('evm_mine');

    for (let i = 0; i < (SHARDED_MINDS_SUPPLY); i++) {
      await shardedMindsDeployment.connect(accounts[i]).functions["mint()"]({
        value: MINT_PRICE,
      })
    }

    await expect(
      shardedMindsDeployment.connect(accounts[101]).functions["mint()"]({
        value: MINT_PRICE,
      })
    ).revertedWith("Total supply reached");

  });
});
