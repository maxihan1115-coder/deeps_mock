const hre = require("hardhat");

async function main() {
    const userAddress = "0x3D0Ae837Cd9486eFFC76C85f00C1df9BF5a4A939"; // 사용자 지갑
    const contractAddress = "0x517D253E988Ac1FAf90Fb78f00dca019EACa7bDB"; // DiamondPurchase 컨트랙트
    const usdcAddress = "0x41E94Eb019C0762f9Bfcf9Fb1E58725BfB0e7582"; // USDC

    console.log("Checking user status...");
    console.log("User:", userAddress);
    console.log("Spender (Contract):", contractAddress);

    const usdc = await hre.ethers.getContractAt("IERC20", usdcAddress);

    // 1. 잔액 조회
    const balance = await usdc.balanceOf(userAddress);
    console.log("USDC Balance:", balance.toString(), `(${hre.ethers.formatUnits(balance, 6)} USDC)`);

    // 2. Allowance 조회
    const allowance = await usdc.allowance(userAddress, contractAddress);
    console.log("Allowance:", allowance.toString(), `(${hre.ethers.formatUnits(allowance, 6)} USDC)`);

    // 3. MATIC 잔액 조회
    const maticBalance = await hre.ethers.provider.getBalance(userAddress);
    console.log("MATIC Balance:", maticBalance.toString(), `(${hre.ethers.formatEther(maticBalance)} MATIC)`);
}

main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
});
