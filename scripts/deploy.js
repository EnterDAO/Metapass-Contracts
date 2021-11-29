// We require the Hardhat Runtime Environment explicitly here. This is optional
// but useful for running the script in a standalone fashion through `node <script>`.
//
// When running the script with `npx hardhat run <script>` you'll find the Hardhat
// Runtime Environment's members available in the global scope.
const hre = require("hardhat");
const whitelist = require("../scripts/whitelist.json");

async function main() {
  // Hardhat always runs the compile task when running scripts with its command
  // line interface.
  //
  // If this script is run directly using `node` you may want to call compile
  // manually to make sure everything is compiled
  // await hre.run('compile');

  // We get the contract to deploy
  console.log("Starting deploy...")
  const ShardedMinds = await hre.ethers.getContractFactory("ShardedMindsTest");
  const shardedMinds = await ShardedMinds.deploy(
    process.env.COLLECTION_NAME,
    process.env.TOKEN_NAME,
    process.env.METADATA_URI,
    process.env.DAO_ADDRESS,
    ethers.utils.parseEther(process.env.MINT_PRICE),
    process.env.SHARDED_MINDS_SUPPLY,
    process.env.BULK_BUY_LIMIT,
    process.env.MAX_NFTS_PER_WALLET,
    process.env.MAX_NFTS_PER_WALLET_PRESALE,
    process.env.PRESALE_START,
    process.env.OFFICIAL_SALE_START,
  );

  await shardedMinds.deployed();
  await shardedMinds.addToPresaleList(whitelist.slice(0, 500));
  console.log("ShardedMinds deployed to:", shardedMinds.address);
}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
