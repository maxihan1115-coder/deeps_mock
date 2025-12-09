const { ethers } = require("hardhat");

async function main() {
    const DIAMOND_PURCHASE_ADDRESS = "0x517D253E988Ac1FAf90Fb78f00dca019EACa7bDB";
    const NEW_TREASURY_ADDRESS = "0xa0502266dce0ec731aaf6a0a8edf5c5bb793d8ad";

    console.log("Updating Treasury Address...");
    console.log("Contract:", DIAMOND_PURCHASE_ADDRESS);
    console.log("New Treasury:", NEW_TREASURY_ADDRESS);

    const [deployer] = await ethers.getSigners();
    console.log("Deployer (Owner):", deployer.address);

    const DiamondPurchase = await ethers.getContractAt(
        "DiamondPurchase",
        DIAMOND_PURCHASE_ADDRESS
    );

    // Check current treasury
    const currentTreasury = await DiamondPurchase.treasuryAddress();
    console.log("Current Treasury:", currentTreasury);

    // Update treasury
    const tx = await DiamondPurchase.updateTreasuryAddress(NEW_TREASURY_ADDRESS);
    console.log("Transaction Hash:", tx.hash);

    await tx.wait();
    console.log("✅ Treasury Address updated successfully!");

    // Verify
    const newTreasury = await DiamondPurchase.treasuryAddress();
    console.log("New Treasury (Verified):", newTreasury);
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });
