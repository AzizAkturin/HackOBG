import { createConfig, http } from 'wagmi'
import { monadTestnet } from 'wagmi/chains'
import { injected } from 'wagmi/connectors'

export const chain = monadTestnet

// MetaMask (and any other browser wallet) is found through the injected provider
// and EIP-6963 discovery. Privy can be added here later as another connector.
export const wagmiConfig = createConfig({
  chains: [monadTestnet],
  connectors: [injected()],
  transports: { [monadTestnet.id]: http() },
})

declare module 'wagmi' {
  interface Register {
    config: typeof wagmiConfig
  }
}
