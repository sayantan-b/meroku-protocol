// SPDX-License-Identifier: MIT
pragma solidity ^0.8.9;

import "./ERC721NameStorageUpgradeable.sol";

import "@openzeppelin/contracts-upgradeable/token/ERC721/ERC721Upgradeable.sol";
import "@openzeppelin/contracts-upgradeable/token/ERC721/extensions/ERC721EnumerableUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/token/ERC721/extensions/ERC721URIStorageUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/security/PausableUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol";

import "@openzeppelin/contracts-upgradeable/token/ERC721/extensions/ERC721BurnableUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol";

import "@openzeppelin/contracts-upgradeable/utils/CountersUpgradeable.sol";
import "@opengsn/contracts/src/ERC2771Recipient.sol";


/**
*  @title AppStoreNFT Upgradeable smart contract
*  @notice This contract can be used for creating NFTs for .appStore names
*  @dev This contract includes minting, burning, pausing, URI updates, and other functions
*  @dev All function calls are currently implement without side effects
*/
contract AppStoreNFTUpgradeable is Initializable, ERC721Upgradeable, ERC721EnumerableUpgradeable, 
                    ERC721URIStorageUpgradeable, PausableUpgradeable, OwnableUpgradeable, 
                        ERC721BurnableUpgradeable, UUPSUpgradeable, ERC721NameStorageUpgradeable, ERC2771Recipient {
    using CountersUpgradeable for CountersUpgradeable.Counter;

    CountersUpgradeable.Counter private _tokenIdCounter;
    event AppStoreNameSet(address indexed owner, uint256 indexed tokenId, string appStoreName, string uri);
    event UpdatedTokenURI(uint256 indexed tokenId, string uri);

    // mapping to store blocked apps for each appStore ex isBlocked[appStoreTokenId][appTokenId]
    mapping(uint256 => mapping(uint256 => bool)) public isBlocked;
    /// @custom:oz-upgrades-unsafe-allow constructor    
    constructor() {
        _disableInitializers();
    }
    function initialize(address trustedForwarder_) initializer public {
        __ERC721_init(".appStoreNFT", ".appStoreNFT");
        __ERC721Enumerable_init();
        __ERC721URIStorage_init();
        __Pausable_init();
        __Ownable_init();
        __ERC721Burnable_init();
        __UUPSUpgradeable_init();
        __ERC721NameStorage_init(".appStore");

        _setTrustedForwarder(trustedForwarder_);
        _tokenIdCounter.increment();
    }

    /**
     * @notice pauses all token transfers and approvals 
     * @dev onlyOwner modifier is applied to the pause function
     */
    function pause() public onlyOwner {
        _pause();
    }

    /**
     * @notice unpauses all token transfers and approvals 
     * @dev onlyOwner modifier is applied to the unpause function
     */
    function unpause() public onlyOwner {
        _unpause();
    }

    function mint(address to, string memory uri, string memory validatedAppStoreName) private {
        uint256 tokenId = _tokenIdCounter.current();
        _tokenIdCounter.increment();
        _safeMint(to, tokenId);
        _setTokenURI(tokenId, uri);
        _setTokensName(tokenId, validatedAppStoreName);
        emit AppStoreNameSet(to, tokenId, validatedAppStoreName, uri);
    }

    /**
     * @notice mints new .appStore NFT but its for onlyOwner
     * @dev checks that minter has not already minted a token and emits an AppStoreNameSet event after minting
     * @param to the address to mint the token to
     * @param uri the uri to set for the token
     * @param appStoreName the name of appStore to set for the token
     */
    function safeMint(address to, string memory uri, string calldata appStoreName) external onlyOwner {
        require(balanceOf(to)==0, "provided wallet already used to create app");
        string memory validatedAppStoreName = _validateName(appStoreName);
        mint(to, uri, validatedAppStoreName);
    }

    /**
     * @notice mints new .appStore NFT
     * @dev checks that minter has not already minted a token and emits an AppStoreNameSet event after minting
     * @param to the address to mint the token to
     * @param appStoreName the name of appStore to set for the token
     */
    function safeMintAppStoreNFT(address to, string calldata appStoreName) external whenNotPaused {
        require(balanceOf(to)==0, "provided wallet already used to create app");
        string memory validatedAppStoreName = _validateName(appStoreName);
        mint(to, "", validatedAppStoreName);
    }


    /**
     * @notice updates the tokenURI for the given token ID
     * @dev checks if caller is the owner/approved for tokenId and emits UpdatedTokenURI event with URI update
     * @param _tokenId uint256 token ID to update the URI for
     * @param _tokenURI string URI to set for the given token ID
     */
    function updateTokenURI(uint256 _tokenId, string memory _tokenURI) external {
        require(_isApprovedOrOwner(_msgSender(), _tokenId), "ERC721: caller is not owner nor approved");
        _setTokenURI(_tokenId, _tokenURI);
        emit UpdatedTokenURI(_tokenId, _tokenURI);
    }


    /**
     * @notice returns the data URI (metadata) for the given token ID
     * @dev adds /data.json to the token URI to get the schema URI
     * @param _tokenId the token ID to get the data URI for
     * @return string the data URI
     */
    function getDataURI(uint256 _tokenId) external view returns (string memory) {
        return string(abi.encodePacked(tokenURI(_tokenId), "/data.json"));
    }

    /**
     * @notice returns the schema URI for the given token ID
     * @dev adds /schema.json to the token URI to get the schema URI
     * @param _tokenId the token ID to get the schema URI for
     * @return string the schema URI
     */
    function getSchemaURI(uint256 _tokenId) external view returns (string memory) {
        return string(abi.encodePacked(tokenURI(_tokenId), "/schema.json"));
    }


    /**
     * @notice blocks the app for the given appStore token ID
     * @dev checks that the caller is the owner or approved for the token
     * @param _appStoreTokenId the appStore token ID to block the app for
     * @param _appTokenId the app token ID to block
     */
    function blockApp(uint256 _appStoreTokenId, uint256[] memory _appTokenId) external {
        require(_isApprovedOrOwner(_msgSender(), _appStoreTokenId), "ERC721: function caller is not owner nor approved");
        for(uint64 i = 0; i < _appTokenId.length; i++){
            isBlocked[_appStoreTokenId][_appTokenId[i]] = true;
        }
    }

    /**
     * @notice unblocks the blocked app for the given appStore token ID
     * @dev checks that the caller is the owner or approved for the token
     * @param _appStoreTokenId the appStore token ID to block the app for
     * @param _appTokenId the app token ID to block
     */
    function unBlockApp(uint256 _appStoreTokenId, uint256[] memory _appTokenId) external {
        require(_isApprovedOrOwner(_msgSender(), _appStoreTokenId), "ERC721: function caller is not owner nor approved");
        for(uint64 i = 0; i < _appTokenId.length; i++){
            isBlocked[_appStoreTokenId][_appTokenId[i]] = false;
        }
    }

    /**
     * @notice function to withdraw fees to owner
     * @dev only owner can call this function
     * @param _to the address to withdraw fees to
     */
    function feesWithdraw(address payable _to) external onlyOwner{
        uint256 amount = (address(this)).balance;
        require(_to.send(amount), 'Fee Transfer to Owner failed.');
    }

    function _beforeTokenTransfer(address from, address to, uint256 tokenId, uint256 batchSize)
        internal
        whenNotPaused
        override(ERC721Upgradeable, ERC721EnumerableUpgradeable)
    {
        super._beforeTokenTransfer(from, to, tokenId, batchSize);
    }

    function _authorizeUpgrade(address newImplementation)
        internal
        onlyOwner
        override
    {}

    // The following functions are overrides required by Solidity.

    function _msgSender()
        internal
        view
        override(ContextUpgradeable, ERC2771Recipient)
        returns (address sender)
    {
        return super._msgSender();
    }

    function _msgData()
        internal
        view
        override(ContextUpgradeable, ERC2771Recipient)
        returns (bytes calldata)
    {
        return super._msgData();
    }

    function _burn(uint256 tokenId)
        internal
        override(ERC721Upgradeable, ERC721URIStorageUpgradeable, ERC721NameStorageUpgradeable)
    {
        super._burn(tokenId);
    }

    function tokenURI(uint256 tokenId)
        public
        view
        override(ERC721Upgradeable, ERC721URIStorageUpgradeable)
        returns (string memory)
    {
        return super.tokenURI(tokenId);
    }

    function supportsInterface(bytes4 interfaceId)
        public
        view
        override(ERC721Upgradeable, ERC721EnumerableUpgradeable, ERC721URIStorageUpgradeable)
        returns (bool)
    {
        return super.supportsInterface(interfaceId);
    }
}
