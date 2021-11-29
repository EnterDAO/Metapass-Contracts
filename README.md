# EnterDAO Sharded Minds

## Overview

EnterDAO Sharded Minds is a collection of 5,000 audiovisual art-pieces created by Angela Pencheva and Raredub as contributors to EnterDAO.

EnterDAO is a decentralized autonomous organization founded with the mission to build the rails of the Web3 metaverse and the decentralized digital economy that encompasses it. The DAO is building a set of DeFi and Gaming products (LandWorks and MetaPortal) in a community-first way. 

The EnterDAO Shared Minds collection, alongside LandWorks and MetaPortal, is a fundamental piece in the growth of the DAO, its community, governance, products and upcoming in-game events. 

The EnterDAO Sharded Minds NFT drop will consist of a presale for whitelisted addresses and official sale, which will start right after the presale ends.

## Presale
Each participant in the presale will be able to mint 1 Sharded Minds NFT. He/she will be also able to mint during the official sale, up to 5 NFTs.

## Official sale
Each participant will be able to mint up to 5 NFTs during the official sale.

## Reserved tokens
There will be a amount of reserved tokens for the team/community. The reserved tokens will be only mintable during the presale period. The max reserved tokens amount will be 50.

## Unique tokens
During the contract deployment and minting phase, 10 random tokens will be uniquely generated and they will be the most rare ones. There is an equal chance to mint an unique token, during both the presale and official sale phases.

## Rarity and minting
Еach EnterDAO Sharded Mind is a unique ERC-721 NFT. It is programmatically assembled on-chain and each token has a genome representing its unique combination of traits, including animated backgrounds and original tracks.

- 5K NFTs  
- 69 Visual Traits
- 10 Original tracks

## Genome

The genome - the combination of the different traits of a sharded minds piece are called genome. The genome is represented by a uint256. Each four decimal places (apart from the last one) represent a single gene. This enables for 10000 different options for each attribute. All of the traits for a single attribute add to 10000. However some traits are more rare(have smaller range of numbers in which they will be dropped) than other traits.
Randomization of the genome is based on generating a hash. The seed for this hash includes network and user specific parameters:

- msg.sender - address creating the NFT
- tx.origin - originator of the transaction (will frequently be the same as msg.sender)
- gasleft() - how much gas is left in this transaction. Tricky to control for an attacker as minor variances of gas costs of operations will always happen and will lead to massively unpredictable results.
- g.lastRandom - the last random number generated
- block.timestamp - the current block timestamp
- block.number - the current block number
- blockhash(block.number) - the hash of the current block
- blockhash(block.number-100) - the hash of the block 100 blocks ago.

Theoretically it is possible for a miner to have a slightly bigger chance in generating a nft of his liking compared to a regular user. This risk, however is negligible for both economical and behavioral reasons. On one hand, the miner will likely be risking a significant block reward and the price of Sharded Minds NFT needs to be sky high in order to make it worth the hassle. On the other hand, EnterDAO Sharded Minds desirability and affinity is a very subjective matter - meaning that if they are going to like or dislike the new nft will depend on the person operating the mining node.

## Gene positions:

- 0 - Background attribute
- 1 - Skin attribute
- 2 - Necklace attribute
- 3 - Mouth attribute
- 4 - Eyes attribute
- 5 - Vortex attribute
- 6 - Track attribute

# Contracts

## ERC721PresetMinterPauserAutoId

Standard OZ one with changed visibility modifier for the token counter

## ShardedMinds

The main contract acting as an ERC721 but also carrying the minting logic.

## ShardedMindsGeneGenerator

The library used for randomness generation.

## Support for EIP-2981 Royalties Standard

The contract that will redirect 2.5% of the collected royalties to the DAO.
