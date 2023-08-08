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
    event SaleCreated(uint256 indexed tokenId, uint256 price);
    event UpdatedTokenURI(uint256 indexed tokenId, string uri);
    event ReviewSubmitted(uint256 indexed tokenId, address indexed reviewer, uint256 rating, uint256 timestamp, string reviewLink);

    uint128 public trading_fees;  // fees percentage in Gwei ex 2Gwei = 2%
    uint128 public renew_fees;    // fees in wei
    uint128 public renew_life;    // timeperiod for which the appStore name can be renewed by current owner
    uint128 public token_life;    // timeperiod for which the appStore name is valid


    // flag to prevent specific appStore name length
    bool public mintSpecialFlag;
    // flag to prevent minting multiple appStore names from one account
    bool public mintManyFlag;
    // flag to prevent minting appStore names from the whitelisted appStores
    bool public checkDappNamesListFlag;
    // (Max)Length of special names
    uint128 public constant SPL_MAX_LENGTH = 3;

    // mapping for storing price of .appStore NFTs when on sale
    mapping(uint256 => uint256) public priceOf;
    // mapping for storing onSale status of .appStore NFTs
    mapping(uint256 => bool) public onSale;
    // mapping for storing expiry timstamp of .appStore NFTs
    mapping(uint256 => uint256) public expireOn;

    IERC721Upgradeable public devNFTAddress;
    IDappNameList public dappNameListAddress;

    //string variable for storing the schema URI
    mapping(uint256 => string) public schemaURI;


    uint128 public mint_fees;    // fees to mint a new appStore name in wei
    // flag to check if the minting is paid or not
    bool public payForMintFlag;

    // structure that will store rating, timestamp & reviewLink
    struct Review {
        uint128 rating;
        uint128 timestamp;
        string reviewLink;
    }
    struct RatingData {
        uint128 totalRating;
        uint128 totalCount;
    }

    // mapping for storing reviews structure for tokenId and reviewAddress
    mapping(uint256 => mapping(address => Review)) private appStoreReview; 

    mapping(uint256 => RatingData) public ratingsData;
    uint256 constant public RATING_PRECISION = 1000000;

    /// @custom:oz-upgrades-unsafe-allow constructor    
    constructor() {
        _disableInitializers();
    }

    function initialize(address devNFTAddress_, address dappNameListAddress_, address trustedForwarder_) initializer public {
        __ERC721_init("MerokuAppStore", "MerokuAppStore");
        __ERC721Enumerable_init();
        __ERC721URIStorage_init();
        __Pausable_init();
        __Ownable_init();
        __ERC721Burnable_init();
        __UUPSUpgradeable_init();
        __ERC721NameStorage_init(".appStore");

        trading_fees = 2000000000; //2Gwei = 2%;
        renew_fees = 20000000000000000; //in wei
        token_life = 365 days;
        renew_life = 30 days;
        devNFTAddress = IERC721Upgradeable(devNFTAddress_);
        dappNameListAddress = IDappNameList(dappNameListAddress_);
        _setTrustedForwarder(trustedForwarder_);
        checkDappNamesListFlag=true;
        _tokenIdCounter.increment();
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

    function mint(address to, string memory uri, string memory validatedAppStoreName) private {
        uint256 tokenId = _tokenIdCounter.current();
        _tokenIdCounter.increment();
        _safeMint(to, tokenId);
        _setTokenURI(tokenId, uri);
        _setTokensName(tokenId, validatedAppStoreName);
        expireOn[tokenId] = block.timestamp + token_life;
        emit AppStoreNameSet(to, tokenId, validatedAppStoreName, uri);
    }

    /**
     * @notice mints new .appStore NFT but its for onlyOwner
     * @dev checks validations for appStore name and emit AppStoreNameSet event on successful minting
     * @param to the address to mint the token to
     * @param uri the uri to set for the token
     * @param appStoreName the name of appStore to set for the token
     */
    function safeMint(address to, string memory uri, string calldata appStoreName) external onlyOwner {
        if(!mintManyFlag){
            require(balanceOf(to)==0, "provided wallet already used to create appStore");
        }
        
        string memory validatedAppStoreName = _validateName(appStoreName);
        mint(to, uri, validatedAppStoreName);
    }

    /**
     * @notice mints new .appStore NFT
     * @dev checks validations for appStore name and emit AppStoreNameSet event on successful minting
     * @param to the address to mint the token to
     * @param uri the uri to set for the token
     * @param appStoreName the name of appStore to set for the token
     */
    function safeMintAppStoreNFT(address to, string memory uri, string calldata appStoreName) external payable whenNotPaused {
        
        if(payForMintFlag){
            require(msg.value >= mint_fees, "Insufficient mint fee");
        }

        if(!mintManyFlag){
            require(balanceOf(to)==0, "provided wallet already used to create appStore");
        }

        string memory validatedAppStoreName = _validateName(appStoreName);
        if(checkDappNamesListFlag){
            require(!dappNameListAddress.isAppNameAvailable(validatedAppStoreName), "AppStore name reserved");
        }
        if (bytes(validatedAppStoreName).length <= SPL_MAX_LENGTH+suffixLength) {
            require(mintSpecialFlag, "Minting of such names is restricted currently");
        }
        
        mint(to, uri, validatedAppStoreName);
    }

    /**
     * @notice renews a .appStore NFT if its expired
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
     * @notice to claim the .appStore NFT by new user if its expired
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
     * @notice creates sale for a .appStore NFT
     * @dev checks if caller is owner of that NFT and set the price for the NFT
     * @param _tokenID the tokenId of the NFT to set on sale
     * @param _amount the price amount to set for the token
     */
    function createSale(uint256 _tokenID, uint256 _amount) external whenNotExpired(_tokenID) {
        require(_amount > 0, "Set some amount");
        require(_msgSender() == _ownerOf(_tokenID), "Not the owner of this tokenId");

        priceOf[_tokenID] = _amount;
        onSale[_tokenID] = true;
        emit SaleCreated(_tokenID, _amount);
    }

    /**
     * @notice ends sale for a .appStore NFT
     * @dev checks if caller is owner of that NFT and sets the price to 0
     * @param _tokenID the tokenId of the NFT to end sale
     */
    function endSale(uint256 _tokenID) external whenNotExpired(_tokenID) {
        require(_msgSender() == _ownerOf(_tokenID), "Not the owner of this tokenId");

        priceOf[_tokenID] = 0;
        onSale[_tokenID] = false;
    }

    /**
     * @notice buy a .appStore NFT which is on sale
     * @dev checks if token is on sale and caller has paid the price of the token
     * @dev on successful buy, transfer token to caller and transfer price to owner of token after deducting fees
     * @param _tokenID the tokenId of the NFT to be bought
     */
    function buyAppStoreNFT(uint256 _tokenID) external payable whenNotExpired(_tokenID) {
        uint256 price = priceOf[_tokenID];
        require(msg.value >= price,"Paid less than price");
        require(onSale[_tokenID], "This NFT is not on sale");
        priceOf[_tokenID] = 0;
        onSale[_tokenID] = false;
        require(payable(_ownerOf(_tokenID)).send(price-price*trading_fees/100000000000),"payment transfer failed");
        _safeTransfer( _ownerOf(_tokenID), _msgSender(), _tokenID, "");
    }

    /**
     * @notice toggles the mintSpecialFlag by onlyOwner
     * @dev this flag is used to check if the appStore name's length is valid ie more than SPL_MAX_LENGTH
     * @param _mintSpecialFlag bool value to set the flag
     */
    function setMintSpecialFlag(bool _mintSpecialFlag) external onlyOwner {
        mintSpecialFlag = _mintSpecialFlag;
    }

    /**
     * @notice toggles the mintManyFlag by onlyOwner
     * @dev this flag is used to check if the caller is allowed to mint many appStores under a single wallet accoount
     * @param _mintManyFlag bool value to set the flag
     */
    function setMintManyFlag(bool _mintManyFlag) external onlyOwner {
        mintManyFlag = _mintManyFlag;
    }

    /**
     * @notice toggles checkDappNamesListFlag by onlyOwner
     * @dev this flag is used to check if the appStore name is available in the dappNameList contract
     * @param _checkDappNamesListFlag bool value to set the flag
     */
    function setCheckDappNamesListFlag(bool _checkDappNamesListFlag) external onlyOwner {
        checkDappNamesListFlag = _checkDappNamesListFlag;
    }

    /**
     * @notice toggles payForMintFlag by onlyOwner
     * @dev this flag is used to check if the appStore name mint is paid or not
     * @param _payForMintFlag bool value to set the flag
     */
    function setPayForMintFlag(bool _payForMintFlag) external onlyOwner {
        payForMintFlag = _payForMintFlag;
    }


    /**
     * @notice set platform trading_fees percentage for the sale of .appStore NFT
     * @dev this is the fee percentage deducted whenever a sale is completed by the buyer
     * @param _new_trading_fees uint128 value which is fees in percentage (add 10^9)
     */
    function setTradingFees(uint128 _new_trading_fees) external onlyOwner {
        trading_fees = _new_trading_fees;
    }

    /**
     * @notice set platform renew_fees for the sale of .appStore NFT
     * @dev this is the fees taken to renew the expired .appStore NFT
     * @param _new_renew_fees uint128 value which is fees in percentage (add 10^9)
     */
    function setRenewFees(uint128 _new_renew_fees) external onlyOwner {
        renew_fees = _new_renew_fees;
    }

    /**
     * @notice set platform mint_fees for the mint of .appStore NFT
     * @dev this is the fees taken to mint a .appStore NFT
     * @param _new_mint_fees uint128 value which is fees in MATIC
     */
    function setMintFees(uint128 _new_mint_fees) external onlyOwner {
        mint_fees = _new_mint_fees;
    }

    /**
     * @notice updates the tokenURI for the given token ID
     * @dev checks if caller is the owner/approved for tokenId and emits UpdatedTokenURI event with URI update
     * @param _tokenID uint256 token ID to update the URI for
     * @param _tokenURI string URI to set for the given token ID
     */
    function updateTokenURI(uint256 _tokenID, string memory _tokenURI) external whenNotExpired(_tokenID) {
        require(_isApprovedOrOwner(_msgSender(), _tokenID), "ERC721: caller is not owner nor approved");
        _setTokenURI(_tokenID, _tokenURI);
        emit MetadataUpdate(_tokenID);
        emit UpdatedTokenURI(_tokenID, _tokenURI);
    }

    /**
     * @notice used to set/update the scehmaURI for .appStore NFT
     * @dev checks if caller is the owner/approved for tokenId
     * @param _tokenID uint256 token ID to update the URI for
     * @param _schemaURI string URI of schema to set for the given token ID
     */
    function setSchemaURI(uint256 _tokenID, string memory _schemaURI) external whenNotExpired(_tokenID)  {
        require(_isApprovedOrOwner(_msgSender(), _tokenID), "ERC721: caller is not owner nor approved");
        schemaURI[_tokenID] = _schemaURI;
    }

    /**
     * @notice submits the reviews for the given token ID by function caller
     * @dev checks rating range emits ReviewSubmitted event after updating average rating
     * @param tokenId uint256 token ID to submit the rating/reviews for
     * @param rating uint128 ranging between 1 & 5
     * @param reviewLink string URI where reviews stored
     */
    function submitReview(uint256 tokenId, uint128 rating, string memory reviewLink) public {
        require(rating >= 1 && rating <= 5, "Invalid rating"); // Assuming rating ranges from 1 to 5

        // Update the avg rating of this tokenId ie .appStore
        updateAverageRating(tokenId, appStoreReview[tokenId][msg.sender].rating, rating);

        // Create a new structReview
        Review memory newReview = Review({
            rating: rating,
            timestamp: uint128(block.timestamp),
            reviewLink: reviewLink
        });

        // Add the newReview to the mapping
        appStoreReview[tokenId][msg.sender] = newReview;

        // Emit the event
        emit ReviewSubmitted(tokenId, msg.sender, rating, block.timestamp, reviewLink);
    }

    /**
     * @notice Function to get specific reviewDetails for a given NFT tokenId and reviewer address
     * @param tokenId uint256 token ID to get the rating/reviews for
     * @param reviewer address of reviewer
     * @return rating uint128 rating points 
     * @return timestamp uint128 time at which rating was posted
     * @return reviewLink string uri where reviewContent is stored
     */
    function getReview(uint256 tokenId, address reviewer) public view returns (uint128, uint128, string memory) {
        Review memory review = appStoreReview[tokenId][reviewer];
        return (review.rating, review.timestamp, review.reviewLink);
    }

    function updateAverageRating(uint256 tokenId, uint128 oldRating, uint128 newRating) internal {
        if(oldRating == 0){
            // first time rating
            ratingsData[tokenId].totalRating += newRating;
            ratingsData[tokenId].totalCount += 1;
        }else{
            // not first time rating
            ratingsData[tokenId].totalRating = ratingsData[tokenId].totalRating + newRating - oldRating;
        }
    }

    /**
     * @notice Function to get average rating for specific tokenId
     * @param tokenId uint256 token ID to get the average rating for
     * @return avgRating uint256 totalRating/totalCount
     */
    function getAverageRating(uint256 tokenId) public view returns (uint256) {
        if (ratingsData[tokenId].totalCount == 0) return 0;
        return ratingsData[tokenId].totalRating * RATING_PRECISION / ratingsData[tokenId].totalCount;
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
