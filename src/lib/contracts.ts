import { parseUnits } from 'viem'

export const FACTORY_ADDRESS = '0x61dA31C366D67d5De8A9E0E0CA280C7B3B900306' as const
export const USDC_ADDRESS = '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913' as const
export const ARBITRATOR_ADDRESS = '0xdA5043637A9505A9daA85c86fEE7D8D463307698' as const

export const factoryAbi = [
    {
        type: 'function',
        name: 'createEscrow',
        inputs: [
            { name: 'seller', type: 'address' },
            { name: 'token', type: 'address' },
            { name: 'amount', type: 'uint256' },
            { name: 'deadline', type: 'uint256' },
            { name: 'arbiter', type: 'address' },
            { name: 'memoHash', type: 'bytes32' },
        ],
        outputs: [{ name: 'escrowAddress', type: 'address' }],
        stateMutability: 'nonpayable',
    },
    {
        type: 'function',
        name: 'getBuyerEscrows',
        inputs: [{ name: '_buyer', type: 'address' }],
        outputs: [{ name: '', type: 'address[]' }],
        stateMutability: 'view',
    },
    {
        type: 'function',
        name: 'getSellerEscrows',
        inputs: [{ name: '_seller', type: 'address' }],
        outputs: [{ name: '', type: 'address[]' }],
        stateMutability: 'view',
    },
    {
        type: 'event',
        name: 'EscrowCreated',
        inputs: [
            { name: 'escrowAddress', type: 'address', indexed: true },
            { name: 'escrowId', type: 'uint256', indexed: true },
            { name: 'buyer', type: 'address', indexed: true },
            { name: 'seller', type: 'address', indexed: false },
            { name: 'token', type: 'address', indexed: false },
            { name: 'amount', type: 'uint256', indexed: false },
            { name: 'deadline', type: 'uint256', indexed: false },
            { name: 'arbiter', type: 'address', indexed: false },
            { name: 'memoHash', type: 'bytes32', indexed: false },
        ],
    },
] as const

export const escrowAbi = [
    {
        type: 'function',
        name: 'fund',
        inputs: [],
        outputs: [],
        stateMutability: 'nonpayable',
    },
    {
        type: 'function',
        name: 'release',
        inputs: [],
        outputs: [],
        stateMutability: 'nonpayable',
    },
    {
        type: 'function',
        name: 'refundAfterDeadline',
        inputs: [],
        outputs: [],
        stateMutability: 'nonpayable',
    },
    {
        type: 'function',
        name: 'openDispute',
        inputs: [],
        outputs: [],
        stateMutability: 'nonpayable',
    },
    {
        type: 'function',
        name: 'getDealInfo',
        inputs: [],
        outputs: [
            { name: '_buyer', type: 'address' },
            { name: '_seller', type: 'address' },
            { name: '_token', type: 'address' },
            { name: '_amount', type: 'uint256' },
            { name: '_deadline', type: 'uint256' },
            { name: '_arbiter', type: 'address' },
            { name: '_memoHash', type: 'bytes32' },
            { name: '_status', type: 'uint8' },
            { name: '_fundedAt', type: 'uint256' },
        ],
        stateMutability: 'view',
    },
] as const

export const erc20Abi = [
    {
        type: 'function',
        name: 'approve',
        inputs: [
            { name: 'spender', type: 'address' },
            { name: 'amount', type: 'uint256' },
        ],
        outputs: [{ name: '', type: 'bool' }],
        stateMutability: 'nonpayable',
    },
    {
        type: 'function',
        name: 'allowance',
        inputs: [
            { name: 'owner', type: 'address' },
            { name: 'spender', type: 'address' },
        ],
        outputs: [{ name: '', type: 'uint256' }],
        stateMutability: 'view',
    },
    {
        type: 'function',
        name: 'balanceOf',
        inputs: [{ name: 'account', type: 'address' }],
        outputs: [{ name: '', type: 'uint256' }],
        stateMutability: 'view',
    },
] as const

export function parseUsdcAmount(amount: string | number): bigint {
    return parseUnits(String(amount), 6)
}
