// SilverScript HTLC Contract for Kaspa Atomic Swaps
// Based on Stroemnet paper Section 2.3

// This contract implements a Hash Time Locked Contract on Kaspa
// using Covenants++ (covpp-reset2 branch)

contract HTLC {
    // Public fields
    bytes32 public hashlock;      // H = sha256(secret)
    uint256 public timelock;       // TA in blocks
    address public alice;          // Creator/sender
    address public bob;            // Receiver
    bool public claimed;           // Claim status
    bool public refunded;         // Refund status

    // Constructor - creates the HTLC
    constructor(
        bytes32 _hashlock,
        uint256 _timelock,
        address _bob
    ) {
        hashlock = _hashlock;
        timelock = _timelock;
        alice = tx.sender;
        bob = _bob;
        claimed = false;
        refunded = false;
    }

    // Claim function - bob can claim with preimage
    // Only works if timelock hasn't expired and hash matches
    function claim(bytes calldata preimage) external {
        require(!claimed, "Already claimed");
        require(!refunded, "Already refunded");
        require(msg.sender == bob, "Only bob can claim");
        
        // Verify hashlock
        require(sha256(preimage) == hashlock, "Invalid preimage");
        
        // Verify timelock hasn't expired
        require(block.height < timelock, "Timelock expired");
        
        claimed = true;
        
        // Transfer funds to bob
        payable(bob).transfer(address(this).balance);
    }

    // Refund function - alice can refund after timelock
    function refund() external {
        require(!claimed, "Already claimed");
        require(!refunded, "Already refunded");
        require(msg.sender == alice, "Only alice can refund");
        
        // Verify timelock has expired
        require(block.height >= timelock, "Timelock not yet expired");
        
        refunded = true;
        
        // Transfer funds back to alice
        payable(alice).transfer(address(this).balance);
    }

    // Get contract info
    function getInfo() external view returns (
        bytes32,
        uint256,
        address,
        address,
        bool,
        bool,
        uint256
    ) {
        return (
            hashlock,
            timelock,
            alice,
            bob,
            claimed,
            refunded,
            address(this).balance
        );
    }
}
