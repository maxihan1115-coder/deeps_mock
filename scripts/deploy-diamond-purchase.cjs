const { ethers } = require("hardhat");
require("dotenv").config();

async function main() {
    console.log("🚀 DiamondPurchase 컨트랙트 배포 시작...\n");

    if (!process.env.DEPLOYER_PRIVATE_KEY) {
        throw new Error("DEPLOYER_PRIVATE_KEY가 환경변수에 없습니다!");
    }
    console.log("✅ DEPLOYER_PRIVATE_KEY 로드됨");

    // USDC 컨트랙트 주소 (Polygon Amoy Testnet)
    const USDC_ADDRESS = "0x41E94Eb019C0762f9Bfcf9Fb1E58725BfB0e7582";

    // Treasury 주소 (.env에서 가져옴)
    const TREASURY_ADDRESS = process.env.CIRCLE_TREASURY_ADDRESS;

    if (!TREASURY_ADDRESS) {
        throw new Error("CIRCLE_TREASURY_ADDRESS가 .env에 설정되지 않았습니다.");
    }

    console.log("📝 배포 설정:");
    console.log(`  - USDC Address: ${USDC_ADDRESS}`);
    console.log(`  - Treasury Address: ${TREASURY_ADDRESS}\n`);

    // 배포자 주소 확인
    const [deployer] = await ethers.getSigners();
    console.log(`🔑 배포자 주소: ${deployer.address}`);

    const balance = await ethers.provider.getBalance(deployer.address);
    console.log(`💰 배포자 잔액: ${ethers.formatEther(balance)} MATIC\n`);

    if (balance === 0n) {
        console.error("❌ 배포자 주소에 MATIC이 없습니다!");
        console.log("   Polygon Amoy Faucet에서 MATIC을 받으세요:");
        console.log("   👉 https://faucet.polygon.technology/");
        return;
    }

    // 컨트랙트 배포
    console.log("⏳ 컨트랙트 배포 중...");
    const DiamondPurchase = await ethers.getContractFactory("DiamondPurchase");
    const contract = await DiamondPurchase.deploy(USDC_ADDRESS, TREASURY_ADDRESS);

    await contract.waitForDeployment();

    const contractAddress = await contract.getAddress();

    console.log("\n✅ 배포 완료!");
    console.log(`📍 컨트랙트 주소: ${contractAddress}`);
    console.log(`🔗 PolygonScan: https://amoy.polygonscan.com/address/${contractAddress}`);

    console.log("\n📋 다음 단계:");
    console.log("1. .env 파일에 다음 라인을 추가하세요:");
    console.log(`   DIAMOND_PURCHASE_CONTRACT=${contractAddress}`);
    console.log("\n2. PolygonScan에서 컨트랙트를 verify하세요 (선택사항):");
    console.log(`   npx hardhat verify --network polygonAmoy ${contractAddress} ${USDC_ADDRESS} ${TREASURY_ADDRESS}`);
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });
