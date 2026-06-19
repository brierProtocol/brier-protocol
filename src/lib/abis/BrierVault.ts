// Minimal ABI for BrierVault (ERC-4626). Extend as new on-chain calls are wired.
// Centralized here so pages/hooks don't re-declare inline ABI fragments.
// `as const` lets wagmi/viem infer function names and argument types.
export const brierVaultABI = [
  {
    inputs: [
      { internalType: 'uint256', name: 'shares', type: 'uint256' },
      { internalType: 'address', name: 'receiver', type: 'address' },
      { internalType: 'address', name: 'owner', type: 'address' },
    ],
    name: 'redeem',
    outputs: [{ internalType: 'uint256', name: '', type: 'uint256' }],
    stateMutability: 'nonpayable',
    type: 'function',
  },
] as const
