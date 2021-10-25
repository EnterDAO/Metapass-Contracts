// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.7.0;
pragma experimental ABIEncoderV2;

import "@openzeppelin/contracts/math/SafeMath.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/utils/Counters.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "./ERC721PresetMinterPauserAutoId.sol";
import "./IMetapass.sol";
import "./MetapassGeneGenerator.sol";
import "./HasSecondarySaleFees.sol";

contract Metapass is
    IMetapass,
    ERC721PresetMinterPauserAutoId,
    ReentrancyGuard,
    HasSecondarySaleFees,
    Ownable
{
    using MetapassGeneGenerator for MetapassGeneGenerator.Gene;
    using SafeMath for uint256;
    using Counters for Counters.Counter;

    MetapassGeneGenerator.Gene internal geneGenerator;

    address payable public daoAddress;
    uint256 public metapassPrice;
    uint256 public maxSupply;
    uint256 public bulkBuyLimit;
    uint256 public maxNFTsPerWallet;
    uint256 public maxNFTsPerWalletPresale;

    event TokenMorphed(
        uint256 indexed tokenId,
        uint256 oldGene,
        uint256 newGene,
        uint256 price,
        Metapass.MetapassEventType eventType
    );
    event TokenMinted(uint256 indexed tokenId, uint256 newGene);
    event MetapassPriceChanged(uint256 newMetapassPrice);
    event MaxSupplyChanged(uint256 newMaxSupply);
    event BulkBuyLimitChanged(uint256 newBulkBuyLimit);
    event BaseURIChanged(string baseURI);

    enum MetapassEventType {
        MINT,
        TRANSFER
    }

    // Optional mapping for token URIs
    mapping(uint256 => uint256) internal _genes;

    // Presale configs
    uint256 presaleStart;
    uint256 officialSaleStart;
    mapping(address => bool) public presaleList;

    constructor(
        string memory name,
        string memory symbol,
        string memory baseURI,
        address payable _daoAddress,
        uint256 _metapassPrice,
        uint256 _maxSupply,
        uint256 _bulkBuyLimit,
        uint256 _maxNFTsPerWallet,
        uint256 _maxNFTsPerWalletPresale,
        uint256 _presaleStart,
        uint256 _officialSaleStart
    ) ERC721PresetMinterPauserAutoId(name, symbol, baseURI) {
        daoAddress = _daoAddress;
        metapassPrice = _metapassPrice;
        maxSupply = _maxSupply;
        bulkBuyLimit = _bulkBuyLimit;
        geneGenerator.random();
        maxNFTsPerWallet = _maxNFTsPerWallet;
        maxNFTsPerWalletPresale = _maxNFTsPerWalletPresale;
        presaleStart = _presaleStart;
        officialSaleStart = _officialSaleStart;
    }

    modifier onlyDAO() {
        require(msg.sender == daoAddress, "Not called from the dao");
        _;
    }

    function addToPresaleList(address[] calldata entries) external onlyOwner {
        for(uint256 i = 0; i < entries.length; i++) {
            require(entries[i] != address(0), "Null address");
            require(!presaleList[entries[i]], "Duplicate entry");
            presaleList[entries[i]] = true;
        }   
    }

    function isPresale() public view returns (bool) {
        if (block.timestamp > presaleStart && block.timestamp < officialSaleStart) {
            return true;
        } else {
            return false;
        }
    }

    function isSale() public view returns (bool) {
        if (block.timestamp > officialSaleStart) {
            return true;
        } else {
            return false;
        }
    }

    function isInPresaleWhitelist(address _address) public view returns (bool) {
        return presaleList[_address];
    }

    function geneOf(uint256 tokenId)
        public
        view
        virtual
        override
        returns (uint256 gene)
    {
        return _genes[tokenId];
    }

    function _beforeTokenTransfer(
        address from,
        address to,
        uint256 tokenId
    ) internal virtual override(ERC721PresetMinterPauserAutoId) {
        ERC721PresetMinterPauserAutoId._beforeTokenTransfer(from, to, tokenId);
        emit TokenMorphed(
            tokenId,
            _genes[tokenId],
            _genes[tokenId],
            0,
            MetapassEventType.TRANSFER
        );
    }

    function mint() public payable override nonReentrant {
        require(_tokenIdTracker.current() < maxSupply, "Total supply reached");
        require(!isPresale() && isSale(), "Official sale not started");

        if (isInPresaleWhitelist(msg.sender)) {
            require(balanceOf(msg.sender) < maxNFTsPerWallet.add(maxNFTsPerWalletPresale), "Mint limit exceeded");
        } else {
            require(balanceOf(msg.sender) < maxNFTsPerWallet, "Mint limit exceeded");
        }

        _tokenIdTracker.increment();

        uint256 tokenId = _tokenIdTracker.current();
        _genes[tokenId] = geneGenerator.random();

        (bool transferToDaoStatus, ) = daoAddress.call{value: metapassPrice}("");
        require(
            transferToDaoStatus,
            "Address: unable to send value, recipient may have reverted"
        );

        uint256 excessAmount = msg.value.sub(metapassPrice);
        if (excessAmount > 0) {
            (bool returnExcessStatus, ) = _msgSender().call{
                value: excessAmount
            }("");
            require(returnExcessStatus, "Failed to return excess.");
        }

        _mint(_msgSender(), tokenId);
        _registerFees(tokenId);

        emit TokenMinted(tokenId, _genes[tokenId]);
        emit TokenMorphed(
            tokenId,
            0,
            _genes[tokenId],
            metapassPrice,
            MetapassEventType.MINT
        );
    }

    function _registerFees(uint256 _tokenId) internal {
        address[] memory _recipients = new address[](1);
        uint256[] memory _bps = new uint256[](1);

        _recipients[0] = daoAddress;
        _bps[0] = 1000;

        Fee memory _fee = Fee({
            recipient: payable(_recipients[0]),
            value: _bps[0]
        });
        fees[_tokenId].push(_fee);
        emit SecondarySaleFees(_tokenId, _recipients, _bps);
    }

    function preSaleMint() public payable override nonReentrant {
        require(_tokenIdTracker.current() < maxSupply, "Total supply reached");
        require(isInPresaleWhitelist(msg.sender), "Not in presale list");
        require(isPresale(), "Presale not started/already finished");
        require(balanceOf(msg.sender) < maxNFTsPerWalletPresale, "Presale mint limit exceeded");

        _tokenIdTracker.increment();

        uint256 tokenId = _tokenIdTracker.current();
        _genes[tokenId] = geneGenerator.random();

        (bool transferToDaoStatus, ) = daoAddress.call{value: metapassPrice}("");
        require(
            transferToDaoStatus,
            "Address: unable to send value, recipient may have reverted"
        );

        uint256 excessAmount = msg.value.sub(metapassPrice);
        if (excessAmount > 0) {
            (bool returnExcessStatus, ) = _msgSender().call{
                value: excessAmount
            }("");
            require(returnExcessStatus, "Failed to return excess.");
        }

        _mint(_msgSender(), tokenId);
        _registerFees(tokenId);

        emit TokenMinted(tokenId, _genes[tokenId]);
        emit TokenMorphed(
            tokenId,
            0,
            _genes[tokenId],
            metapassPrice,
            MetapassEventType.MINT
        );
    }

    function bulkBuy(uint256 amount) public payable override nonReentrant {
        require(
            amount <= bulkBuyLimit,
            "Cannot bulk buy more than the preset limit"
        );
        require(
            _tokenIdTracker.current().add(amount) <= maxSupply,
            "Total supply reached"
        );
        require(
            !isPresale() && isSale(), 
            "Official sale not started"
        );

        if (isInPresaleWhitelist(msg.sender)) {
            require(balanceOf(msg.sender).add(amount) <= maxNFTsPerWallet.add(maxNFTsPerWalletPresale), "Mint limit exceeded");
        } else {
            require(balanceOf(msg.sender).add(amount) <= maxNFTsPerWallet, "Mint limit exceeded");
        }

        (bool transferToDaoStatus, ) = daoAddress.call{
            value: metapassPrice.mul(amount)
        }("");
        require(
            transferToDaoStatus,
            "Address: unable to send value, recipient may have reverted"
        );

        uint256 excessAmount = msg.value.sub(metapassPrice.mul(amount));
        if (excessAmount > 0) {
            (bool returnExcessStatus, ) = _msgSender().call{
                value: excessAmount
            }("");
            require(returnExcessStatus, "Failed to return excess.");
        }

        for (uint256 i = 0; i < amount; i++) {
            _tokenIdTracker.increment();

            uint256 tokenId = _tokenIdTracker.current();
            _genes[tokenId] = geneGenerator.random();
            _mint(_msgSender(), tokenId);
            _registerFees(tokenId);

            emit TokenMinted(tokenId, _genes[tokenId]);
            emit TokenMorphed(
                tokenId,
                0,
                _genes[tokenId],
                metapassPrice,
                MetapassEventType.MINT
            );
        }
    }

    function lastTokenId() public view override returns (uint256 tokenId) {
        return _tokenIdTracker.current();
    }

    function mint(address to)
        public
        pure
        override(ERC721PresetMinterPauserAutoId)
    {
        revert("Should not use this one");
    }

    function setMetapassPrice(uint256 newMetapassPrice)
        public
        virtual
        override
        onlyDAO
    {
        metapassPrice = newMetapassPrice;

        emit MetapassPriceChanged(newMetapassPrice);
    }

    function setMaxSupply(uint256 _maxSupply) public virtual override onlyDAO {
        maxSupply = _maxSupply;

        emit MaxSupplyChanged(maxSupply);
    }

    function setBulkBuyLimit(uint256 _bulkBuyLimit)
        public
        virtual
        override
        onlyDAO
    {
        bulkBuyLimit = _bulkBuyLimit;

        emit BulkBuyLimitChanged(_bulkBuyLimit);
    }

    function setBaseURI(string memory _baseURI) public virtual onlyDAO {
        _setBaseURI(_baseURI);

        emit BaseURIChanged(_baseURI);
    }

    receive() external payable {
        mint();
    }
}
