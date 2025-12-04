export const ERC20_ABI = [
    {
        inputs: [
            { internalType: "address", name: "spender", type: "address" },
            { internalType: "uint256", name: "amount", type: "uint256" },
        ],
        name: "approve",
        outputs: [{ internalType: "bool", name: "", type: "bool" }],
        stateMutability: "nonpayable",
        type: "function",
    },
    {
        inputs: [{ internalType: "address", name: "account", type: "address" }],
        name: "balanceOf",
        outputs: [{ internalType: "uint256", name: "", type: "uint256" }],
        stateMutability: "view",
        type: "function",
    },
    {
        inputs: [
            { internalType: "address", name: "owner", type: "address" },
            { internalType: "address", name: "spender", type: "address" },
        ],
        name: "allowance",
        outputs: [{ internalType: "uint256", name: "", type: "uint256" }],
        stateMutability: "view",
        type: "function",
    },
] as const;

export const DIAMOND_PURCHASE_ABI = [
    {
        inputs: [
            { internalType: "uint256", name: "gameUuid", type: "uint256" },
            { internalType: "uint256", name: "diamondAmount", type: "uint256" },
            { internalType: "uint256", name: "usdcAmount", type: "uint256" },
        ],
        name: "purchaseDiamond",
        outputs: [],
        stateMutability: "nonpayable",
        type: "function",
    },
    {
        anonymous: false,
        inputs: [
            { indexed: true, internalType: "address", name: "user", type: "address" },
            { indexed: true, internalType: "uint256", name: "gameUuid", type: "uint256" },
            { indexed: false, internalType: "uint256", name: "diamondAmount", type: "uint256" },
            { indexed: false, internalType: "uint256", name: "usdcAmount", type: "uint256" },
            { indexed: false, internalType: "uint256", name: "timestamp", type: "uint256" },
        ],
        name: "DiamondPurchased",
        type: "event",
    },
] as const;

export const DIAMOND_PURCHASE_ADDRESS = process.env.NEXT_PUBLIC_DIAMOND_PURCHASE_CONTRACT || "0x517D253E988Ac1FAf90Fb78f00dca019EACa7bDB";
export const USDC_ADDRESS = "0x41E94Eb019C0762f9Bfcf9Fb1E58725BfB0e7582";
