import { getDefaultConfig } from '@rainbow-me/rainbowkit';
import { base } from 'wagmi/chains';

export const CONTRACT_ADDRESS = '0x00B8e6cbEC87b149bBcfC9ea9853DeeDd19184d8' as const;

export const config = getDefaultConfig({
  appName: "Dragon's Riddle Vault",
  projectId: process.env.NEXT_PUBLIC_WC_PROJECT_ID || 'demo',
  chains: [base],
  ssr: true,
});
