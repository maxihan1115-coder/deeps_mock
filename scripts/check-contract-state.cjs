const hre = require("hardhat");

async function main() {
    const contractAddress = "0x517D253E988Ac1FAf90Fb78f00dca019EACa7bDB";
    const contract = await hre.ethers.getContractAt("DiamondPurchase", contractAddress);

    console.log("Checking contract state...");

    try {
        const treasury = await contract.treasuryAddress();
        console.log("Treasury Address:", treasury);

        const usdc = await contract.usdcToken();
        console.log("USDC Address:", usdc);

        const owner = await contract.owner();
        console.log("Owner Address:", owner);

    } catch (error) {
        console.error("Error reading contract state:", error);
    }
}

main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
});
