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

interface IDappNameList {
    function isAppNameAvailable(string memory appName) external view returns (bool);
}

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


    // flag to prevent specific dev name length
    bool public mintSpecialFlag;
    // flag to prevent minting dev names from the whitelisted devs
    bool public checkDappNamesListFlag;
    // (Max)Length of special names
    uint128 public constant SPL_MAX_LENGTH = 3;
    IDappNameList public dappNameListAddress;

    //string variable for storing the schema URI
    string public schemaURI;
    uint128 public renew_fees;    // fees in wei
    uint128 public renew_life;    // timeperiod for which the dev name can be renewed by current owner
    uint128 public token_life;    // timeperiod for which the dev name is valid



    // mapping for storing expiry timstamp of .dev NFTs
    mapping(uint256 => uint256) public expireOn;

    uint128 public mint_fees;    // fees to mint a new dev name in wei
    // flag to check if the minting is paid or not
    bool public payForMintFlag;

    /// @custom:oz-upgrades-unsafe-allow constructor    
    constructor() {
        _disableInitializers();
    }
    function initialize(address dappNameListAddress_, address trustedForwarder_) initializer public {
        __ERC721_init("devNFT", "devNFT");
        __ERC721Enumerable_init();
        __ERC721URIStorage_init();
        __Pausable_init();
        __Ownable_init();
        __ERC721Burnable_init();
        __UUPSUpgradeable_init();
        __ERC721NameStorage_init(".dev");

        renew_fees = 20000000000000000; //in wei
        token_life = 365 days;
        renew_life = 30 days;

        dappNameListAddress = IDappNameList(dappNameListAddress_);
        _setTrustedForwarder(trustedForwarder_);
        _tokenIdCounter.increment();
        checkDappNamesListFlag=true;
        mint_fees = 1000000000000000000;
        payForMintFlag = true;


    }

    /**
     * @dev Throws if token expired
     */
    modifier whenNotExpired(uint256 _tokenId) {
        _checkExpiry(_tokenId);
        _;
    }

    /**
     * @dev Throws if the current timestamp is more than expiry timestamp
     */
    function _checkExpiry(uint256 _tokenId) internal view virtual {
        require(expireOn[_tokenId] > block.timestamp, "Cant continue, Name Token Expired");
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

    function mint(address to, string memory uri, string memory validatedDevName) internal {
        uint256 tokenId = _tokenIdCounter.current();
        _tokenIdCounter.increment();
        _safeMint(to, tokenId);
        _setTokenURI(tokenId, uri);
        _setTokensName(tokenId, validatedDevName);
        expireOn[tokenId] = block.timestamp + token_life;
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
        require(balanceOf(to)==0, "provided wallet already used to create dev");
        string memory validatedDevName = _validateName(devName);
        mint(to, uri, validatedDevName);
    }

    /**
     * @notice mints new .dev NFT
     * @dev checks validations for dev name and emits DevNameSet event on successful mint
     * @param to the address to mint the token to
     * @param uri the uri to set for the token
     * @param devName the name of dev to set for the token
     */
    function safeMintDevNFT(address to, string memory uri, string calldata devName) external payable whenNotPaused {
        
        if(payForMintFlag){
            require(msg.value >= mint_fees, "Insufficient mint fee");
        }
        
        require(balanceOf(to)==0, "provided wallet already used to create dev");
        string memory validatedDevName = _validateName(devName);
        if(checkDappNamesListFlag){
            require(!dappNameListAddress.isAppNameAvailable(validatedDevName), "Dev name reserved");
        }
        if (bytes(validatedDevName).length <= SPL_MAX_LENGTH+suffixLength) {
            require(mintSpecialFlag, "Minting of such names is restricted currently");
        }
        mint(to, uri, validatedDevName);
    }

    /**
     * @notice renews a .dev NFT if its expired
     * @dev checks if tokenID is expired and renews it for 1 year if renew_fees is paid
     * @param _tokenID the tokenId of the NFT to renew
     */
    function renewToken(uint256 _tokenID) external payable whenNotPaused {
        require(_exists(_tokenID), "Token does not exist");
        require(_msgSender() == _ownerOf(_tokenID), "Not the owner of this tokenId");
        require(expireOn[_tokenID] < block.timestamp, "Token is not expired yet");
        require(msg.value >= renew_fees, "Insufficient renew fees");
        expireOn[_tokenID] = block.timestamp + token_life;
    }

    /**
     * @notice to claim the .dev NFT by new user if its expired
     * @dev checks if tokenID is expired & renew_period is also passed and new user can claim it if renew_fees is paid
     * @param _tokenID the tokenId of the NFT to claim
     */
    function claimToken(uint256 _tokenID) external payable whenNotPaused {
        require(_exists(_tokenID), "Token does not exist");
        require(expireOn[_tokenID] + renew_life < block.timestamp, "Token not available for claiming yet");
        require(msg.value >= renew_fees, "Insufficient renew fees");
        expireOn[_tokenID] = block.timestamp + token_life;
        _safeTransfer(_ownerOf(_tokenID), _msgSender(), _tokenID, "");
    }
    /**
     * @notice toggles the mintSpecialFlag by onlyOwner
     * @dev this flag is used to check if the dev name's length is valid ie more than SPL_MAX_LENGTH
     * @param _mintSpecialFlag bool value to set the flag
     */
    function setMintSpecialFlag(bool _mintSpecialFlag) external onlyOwner {
        mintSpecialFlag = _mintSpecialFlag;
    }

    /**
     * @notice toggles checkDappNamesListFlag by onlyOwner
     * @dev this flag is used to check if the dev name is available in the dappNameList contract
     * @param _checkDappNamesListFlag bool value to set the flag
     */
    function setCheckDappNamesListFlag(bool _checkDappNamesListFlag) external onlyOwner {
        checkDappNamesListFlag = _checkDappNamesListFlag;
    }

    /**
     * @notice toggles payForMintFlag by onlyOwner
     * @dev this flag is used to check if the dev name mint is paid or not
     * @param _payForMintFlag bool value to set the flag
     */
    function setPayForMintFlag(bool _payForMintFlag) external onlyOwner {
        payForMintFlag = _payForMintFlag;
    }


    /**
     * @notice set platform renew_fees for the sale of .dev NFT
     * @dev this is the fees taken to renew the expired .dev NFT
     * @param _new_renew_fees uint128 value which is fees in percentage (add 10^9)
     */
    function setRenewFees(uint128 _new_renew_fees) external onlyOwner {
        renew_fees = _new_renew_fees;
    }

    /**
     * @notice set platform mint_fees for the mint of .dev NFT
     * @dev this is the fees taken to mint a .dev NFT
     * @param _new_mint_fees uint128 value which is fees in MATIC
     */
    function setMintFees(uint128 _new_mint_fees) external onlyOwner {
        mint_fees = _new_mint_fees;
    }

    /**
     * @notice updates the tokenURI for the given token ID
     * @dev checks if caller is the owner/approved for tokenId and emits UpdatedTokenURI event with URI update
     * @param _tokenId uint256 token ID to update the URI for
     * @param _tokenURI string URI to set for the given token ID
     */
    function updateTokenURI(uint256 _tokenId, string memory _tokenURI) external whenNotExpired(_tokenId) {
        require(_isApprovedOrOwner(_msgSender(), _tokenId), "ERC721: caller is not owner nor approved");
        _setTokenURI(_tokenId, _tokenURI);
        emit MetadataUpdate(_tokenId);
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
        require(balanceOf(to)==0,"Recepient already owns a MerokuDev");
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
