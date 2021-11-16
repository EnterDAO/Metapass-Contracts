// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.9;

import "./ShardedMinds.sol";
import "./ShardedMindsGeneGenerator.sol";
import "@openzeppelin/contracts/utils/math/SafeMath.sol";

contract ShardedMindsTest is ShardedMinds {
    using SafeMath for uint256;
    using ShardedMindsGeneGenerator for ShardedMindsGeneGenerator.Gene;

    uint256 public generatedUniquesCount;

    event UniqueTokenGenerated(uint256 tokenId, uint256 gene);

    constructor(
        string memory name,
        string memory symbol,
        string memory baseURI,
        address payable _daoAddress,
        uint256 _shardedMindsPrice,
        uint256 _maxSupply,
        uint256 _bulkBuyLimit,
        uint256 _maxNFTsPerWallet,
        uint256 _maxNFTsPerWalletPresale,
        uint256 _presaleStart,
        uint256 _officialSaleStart
    )
        ShardedMinds(
            name,
            symbol,
            baseURI,
            _daoAddress,
            _shardedMindsPrice,
            _maxSupply,
            _bulkBuyLimit,
            _maxNFTsPerWallet,
            _maxNFTsPerWalletPresale,
            _presaleStart,
            _officialSaleStart
        )
    {}

    function generateUniques() internal virtual override(ShardedMinds) {
        for (uint256 i = 1; i <= uniquesCount; i++) {
            uint256 selectedToken = geneGenerator.random() % maxSupply;
            require(selectedToken != 0, "Token Id cannot be 0");
            _uniqueGenes[selectedToken] = i;
            generatedUniquesCount = generatedUniquesCount.add(1);
            emit UniqueTokenGenerated(selectedToken, uint256(keccak256(abi.encode(selectedToken))));
        }
    }

    function changeOfficialSaleStart(uint256 newOfficialSaleStart) external {
        officialSaleStart = newOfficialSaleStart;
    }

    function changePresaleStart(uint256 newPresaleStart) external {
        presaleStart = newPresaleStart;
    }

    function toggleWhitelistAddress(
        address whitelistAddress,
        bool _isWhitelisted
    ) external {
        require(whitelistAddress != address(0), "Null address");
        presaleList[whitelistAddress] = _isWhitelisted;
    }
}
