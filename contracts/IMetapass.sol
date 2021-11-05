// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.9;

import "@openzeppelin/contracts/interfaces/IERC721.sol";

interface IMetapass is IERC721 {
    function geneOf(uint256 tokenId) external view returns (uint256 gene);

    function mint() external payable;

    function presaleMint() external payable;

    function reserveMint(uint256 amount) external;

    function bulkBuy(uint256 amount) external payable;

    function lastTokenId() external view returns (uint256 tokenId);

    function setMetapassPrice(uint256 newLobsterPrice) external;

    function setMaxSupply(uint256 maxSupply) external;

    function setBulkBuyLimit(uint256 bulkBuyLimit) external;

    function setBaseURI(string memory _baseURI) external;
}