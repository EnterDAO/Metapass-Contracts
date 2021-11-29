module.exports = [
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
];