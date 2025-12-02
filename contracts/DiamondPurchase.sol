// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

/**
 * @title DiamondPurchase
 * @dev USDC를 사용하여 게임 내 다이아몬드를 구매하는 스마트 컨트랙트
 */
contract DiamondPurchase is Ownable, ReentrancyGuard {
    IERC20 public immutable usdcToken;
    address public treasuryAddress;

    // 이벤트
    event DiamondPurchased(
        address indexed user,
        uint256 indexed gameUuid,
        uint256 diamondAmount,
        uint256 usdcAmount,
        uint256 timestamp
    );

    event TreasuryAddressUpdated(
        address indexed oldAddress,
        address indexed newAddress
    );

    /**
     * @dev Constructor
     * @param _usdcToken USDC 토큰 컨트랙트 주소
     * @param _treasuryAddress Treasury 지갑 주소
     */
    constructor(
        address _usdcToken,
        address _treasuryAddress
    ) Ownable(msg.sender) {
        require(_usdcToken != address(0), "Invalid USDC address");
        require(_treasuryAddress != address(0), "Invalid treasury address");
        
        usdcToken = IERC20(_usdcToken);
        treasuryAddress = _treasuryAddress;
    }

    /**
     * @dev 다이아몬드 구매
     * @param gameUuid 게임 내 사용자 UUID
     * @param diamondAmount 구매할 다이아몬드 수량
     * @param usdcAmount 지불할 USDC 금액 (6 decimals)
     */
    function purchaseDiamond(
        uint256 gameUuid,
        uint256 diamondAmount,
        uint256 usdcAmount
    ) external nonReentrant {
        require(diamondAmount > 0, "Diamond amount must be greater than 0");
        require(usdcAmount > 0, "USDC amount must be greater than 0");
        require(gameUuid > 0, "Invalid game UUID");

        // USDC 전송 (사용자가 approve 필요)
        bool success = usdcToken.transferFrom(
            msg.sender,
            treasuryAddress,
            usdcAmount
        );
        require(success, "USDC transfer failed");

        // 이벤트 발생 (백엔드가 리스닝)
        emit DiamondPurchased(
            msg.sender,
            gameUuid,
            diamondAmount,
            usdcAmount,
            block.timestamp
        );
    }

    /**
     * @dev Treasury 주소 업데이트 (Owner only)
     * @param newTreasuryAddress 새로운 Treasury 주소
     */
    function updateTreasuryAddress(address newTreasuryAddress) external onlyOwner {
        require(newTreasuryAddress != address(0), "Invalid treasury address");
        
        address oldAddress = treasuryAddress;
        treasuryAddress = newTreasuryAddress;
        
        emit TreasuryAddressUpdated(oldAddress, newTreasuryAddress);
    }

    /**
     * @dev 사용자의 USDC allowance 확인
     * @param user 사용자 주소
     * @return 현재 allowance 금액
     */
    function getUserAllowance(address user) external view returns (uint256) {
        return usdcToken.allowance(user, address(this));
    }

    /**
     * @dev 사용자의 USDC 잔액 확인
     * @param user 사용자 주소
     * @return USDC 잔액
     */
    function getUserBalance(address user) external view returns (uint256) {
        return usdcToken.balanceOf(user);
    }
}
