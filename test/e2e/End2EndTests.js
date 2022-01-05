const { expect } = require("chai");
const { waffle, network } = require("hardhat");
const { loadFixture } = waffle;

const COLLECTION_NAME = process.env.COLLECTION_NAME;
const TOKEN_NAME = process.env.TOKEN_NAME;
const METADATA_URI = process.env.METADATA_URI;
const DAO_ADDRESS = process.env.DAO_ADDRESS;
const MINT_PRICE = ethers.utils.parseEther(process.env.MINT_PRICE);
const SHARDED_MINDS_SUPPLY = 80;
const BULK_BUY_LIMIT = process.env.BULK_BUY_LIMIT;
const MAX_NFTS_PER_WALLET = process.env.MAX_NFTS_PER_WALLET;
const MAX_NFTS_PER_WALLET_PRESALE = process.env.MAX_NFTS_PER_WALLET_PRESALE;
const PRESALE_START = Math.round(new Date().getTime() / 1000);
const OFFICIAL_SALE_START = PRESALE_START + 3600;

describe("ShardedMinds End 2 End Tests", () => {
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

  it("Should successfully go through the whole flow - whitelist mint, reserve mint, official sale mint", async () => {
    const { shardedMindsDeployment, whitelistAddresses } = await loadFixture(deployContract);
    const accounts = await ethers.getSigners();

    // Add the first 50 accounts to the presale list (without the deployer)
    await shardedMindsDeployment.addToPresaleList(whitelistAddresses);

    // Check if the contract is deployed with the right configuration
    expect(await shardedMindsDeployment.name()).to.equal(COLLECTION_NAME);
    expect(await shardedMindsDeployment.symbol()).to.equal(TOKEN_NAME);

    // Check if the addresses added to the whitelist are there
    expect(await shardedMindsDeployment.isInPresaleWhitelist(whitelistAddresses[0])).to.be.true;
    expect(await shardedMindsDeployment.isInPresaleWhitelist(whitelistAddresses[49])).to.be.true;
    expect(await shardedMindsDeployment.isInPresaleWhitelist(accounts[0].address)).to.be.false;

    // Check if the unique tokens are being generated
    let uniquesCount = 7;
    let generatedUniquesCount = await shardedMindsDeployment.generatedUniquesCount();
    expect(uniquesCount).to.equal(generatedUniquesCount);

    // Try to presale mint from deployer which is not whitelisted, should revert
    await expect(
      shardedMindsDeployment.connect(accounts[0]).functions["presaleMint(uint256)"](MAX_NFTS_PER_WALLET_PRESALE, {
        value: MINT_PRICE.mul(MAX_NFTS_PER_WALLET_PRESALE),
      })
    ).revertedWith("Not in presale list");

    // Try to presale mint from address which is whitelisted, should pass
    await expect(
      shardedMindsDeployment.connect(accounts[1]).functions["presaleMint(uint256)"](MAX_NFTS_PER_WALLET_PRESALE, {
        value: MINT_PRICE.mul(MAX_NFTS_PER_WALLET_PRESALE),
      })
    ).to.be.emit(shardedMindsDeployment, "TokenMinted");

    // Try to presale mint from the same address, after 2 NFTs have been already minted, should revert
    await expect(
      shardedMindsDeployment.connect(accounts[1]).functions["presaleMint(uint256)"](1, {
        value: MINT_PRICE,
      })
    ).revertedWith("Presale mint limit exceeded");

    // Try to presale mint from another address which is whitelisted and haven't yet minted, should pass
    await expect(
      shardedMindsDeployment.connect(accounts[2]).functions["presaleMint(uint256)"](MAX_NFTS_PER_WALLET_PRESALE, {
        value: MINT_PRICE.mul(MAX_NFTS_PER_WALLET_PRESALE),
      })
    ).to.be.emit(shardedMindsDeployment, "TokenMinted");

    // Try to mint the reserved tokens, mintable only from the deployer/owner of the contract, called from other address, should revert
    await expect(
      shardedMindsDeployment.connect(accounts[1]).functions["reserveMint(uint256)"](1)
    ).revertedWith("Ownable: caller is not the owner");

    // Try to mint all the reserved tokens, called by the deployer, should pass
    await expect(
        shardedMindsDeployment.connect(accounts[0]).functions["reserveMint(uint256)"](50)
      ).to.be.emit(shardedMindsDeployment, "TokenMinted");

    // Try to mint more than the reserve limit - 50, should revert
    await expect(
      shardedMindsDeployment.connect(accounts[0]).functions["reserveMint(uint256)"](1)
    ).revertedWith("Mint limit exceeded");

    // Set time to the official sale start
    await ethers.provider.send('evm_setNextBlockTimestamp', [OFFICIAL_SALE_START]); 
    await ethers.provider.send('evm_mine');

    // Try to presale mint after the presale has ended, should revert
    await expect(
      shardedMindsDeployment.connect(accounts[3]).functions["presaleMint(uint256)"](1, {
        value: MINT_PRICE,
      })
    ).revertedWith("Presale not started/already finished");

    // Non whitelisted address should be able to bulk buy up to 10, should pass
    await expect(
        shardedMindsDeployment.connect(accounts[51]).functions["bulkBuy(uint256)"](MAX_NFTS_PER_WALLET, {
            value: MINT_PRICE.mul(MAX_NFTS_PER_WALLET),
        })
    ).to.be.emit(shardedMindsDeployment, "TokenMinted");

    // Non whitelisted address should not be able to buy more NFTs, after 10 have been bought, should revert
    await expect(
        shardedMindsDeployment.connect(accounts[51]).functions["bulkBuy(uint256)"](1, {
            value: MINT_PRICE.mul(1),
        })
    ).revertedWith("Mint limit exceeded");

    // Whitelisted address should be able to buy 10 more NFTs, after minting 2 from presale
    await expect(
        shardedMindsDeployment.connect(accounts[2]).functions["bulkBuy(uint256)"](MAX_NFTS_PER_WALLET, {
            value: MINT_PRICE.mul(MAX_NFTS_PER_WALLET),
        })
    ).to.be.emit(shardedMindsDeployment, "TokenMinted");

    // Whitelisted address should not be able to buy more NFTs, after minting 2 from presale and 10 from official sale
    await expect(
        shardedMindsDeployment.connect(accounts[2]).functions["bulkBuy(uint256)"](1, {
            value: MINT_PRICE.mul(1),
        })
    ).revertedWith("Mint limit exceeded");

    let totalSupply = await shardedMindsDeployment.totalSupply();
    let maxSupply  =  await shardedMindsDeployment.maxSupply();
    
    // Get the remaining tokens to mint
    let remainingNFTsToMint = maxSupply.sub(totalSupply).toNumber();
    
    // Try to mint more than the max supply using bulkBuy, should revert
    await expect(
        shardedMindsDeployment.connect(accounts[60]).functions["bulkBuy(uint256)"](MAX_NFTS_PER_WALLET, {
            value: MINT_PRICE.mul(MAX_NFTS_PER_WALLET),
        })
    ).revertedWith("Total supply reached");
    
    // Try to mint the remaining NFTs, up to the max supply, should pass
    await expect(
        shardedMindsDeployment.connect(accounts[60]).functions["bulkBuy(uint256)"](remainingNFTsToMint, {
            value: MINT_PRICE.mul(remainingNFTsToMint),
        })
    ).to.be.emit(shardedMindsDeployment, "TokenMinted");

    // Try to mint more than the max supply using mint, should revert
    await expect(
        shardedMindsDeployment.connect(accounts[60]).functions["mint()"]({
            value: MINT_PRICE,
        })
    ).revertedWith("Total supply reached");

    // Check the balances of minted tokens
    let account0Balance = await shardedMindsDeployment.balanceOf(accounts[0].address);
    let account1Balance = await shardedMindsDeployment.balanceOf(accounts[1].address);
    let account2Balance = await shardedMindsDeployment.balanceOf(accounts[2].address);
    let account3Balance = await shardedMindsDeployment.balanceOf(accounts[3].address);
    let account51Balance = await shardedMindsDeployment.balanceOf(accounts[51].address);
    let account60Balance = await shardedMindsDeployment.balanceOf(accounts[60].address);

    // Should have only 50 NFTs, from the reserve mint
    expect(account0Balance.toNumber()).to.equal(50);

    // Should have only 2 NFT from whitelist
    expect(account1Balance.toNumber()).to.equal(2);

    // Should have 10 + 2 = 12 NFTs from presale and sale mint
    expect(account2Balance.toNumber()).to.equal(12);

    // Should have 0, as only tried to presale mint, after presale ended
    expect(account3Balance.toNumber()).to.equal(0);

    // Should have 10 NFTs, minted only during official sale
    expect(account51Balance.toNumber()).to.equal(10);

    // Should have only NFTs, minted the last available before the max supply was reached
    expect(account60Balance.toNumber()).to.equal(remainingNFTsToMint);

  });

});
