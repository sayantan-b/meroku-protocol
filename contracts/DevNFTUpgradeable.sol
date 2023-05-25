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
*  @title DevNFT Upgradeable smart contract
*  @notice This contract can be used for creating NFTs for .dev names
*  @dev This contract includes minting, burning, pausing, URI updates, and other functions
*  @dev All function calls are currently implement without side effects
*/
contract DevNFTUpgradeable is Initializable, ERC721Upgradeable, ERC721EnumerableUpgradeable, 
                    ERC721URIStorageUpgradeable, PausableUpgradeable, OwnableUpgradeable, 
                        ERC721BurnableUpgradeable, UUPSUpgradeable, ERC721NameStorageUpgradeable, ERC2771Recipient {
    using CountersUpgradeable for CountersUpgradeable.Counter;

    CountersUpgradeable.Counter private _tokenIdCounter;
    event DevNameSet(address indexed owner, uint256 indexed tokenId, string devName, string uri);
    event UpdatedTokenURI(uint256 indexed tokenId, string uri);


    //string variable for storing the schema URI
    string public schemaURI;


    /// @custom:oz-upgrades-unsafe-allow constructor    
    constructor() {
        _disableInitializers();
    }
    function initialize(address trustedForwarder_) initializer public {
        __ERC721_init("devNFT", "devNFT");
        __ERC721Enumerable_init();
        __ERC721URIStorage_init();
        __Pausable_init();
        __Ownable_init();
        __ERC721Burnable_init();
        __UUPSUpgradeable_init();
        __ERC721NameStorage_init(".dev");

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

    function mint(address to, string memory uri, string memory validatedDevName) private {
        uint256 tokenId = _tokenIdCounter.current();
        _tokenIdCounter.increment();
        _safeMint(to, tokenId);
        _setTokenURI(tokenId, uri);
        _setTokensName(tokenId, validatedDevName);
        emit DevNameSet(to, tokenId, validatedDevName, uri);
    }

    /**
     * @notice mints new .dev NFT but its for onlyOwner
     * @dev checks validations for dev name and emits DevNameSet event on successful mint
     * @param to the address to mint the token to
     * @param uri the uri to set for the token
     * @param devName the name of dev to set for the token
     */
    function safeMint(address to, string memory uri, string calldata devName) external onlyOwner {
        require(balanceOf(to)==0, "provided wallet already used to create app");
        string memory validatedDevName = _validateName(devName);
        mint(to, uri, validatedDevName);
    }

    /**
     * @notice mints new .dev NFT
     * @dev checks validations for dev name and emits DevNameSet event on successful mint
     * @param to the address to mint the token to
     * @param devName the name of dev to set for the token
     */
    function safeMintDevNFT(address to, string calldata devName) external whenNotPaused {
        require(balanceOf(to)==0, "provided wallet already used to create app");
        string memory validatedDevName = _validateName(devName);
        mint(to, "", validatedDevName);
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
     * @notice used to set/update the scehmaURI for .dev NFT
     * @dev schemaURI is used to validate the metadata of the NFT and can be updated by onlyOwner
     * @param _schemaURI string URI
     */
    function setSchemaURI(string memory _schemaURI) external onlyOwner {
        schemaURI = _schemaURI;
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

    /**
     * @notice function to set trusted forwarder
     * @dev only owner can call this function
     * @param _trustedForwarder the address of trusted forwarder
     */
    function setTrustedForwarder(address _trustedForwarder) external onlyOwner {
        _setTrustedForwarder(_trustedForwarder);
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
