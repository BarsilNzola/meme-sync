MemeSync
===========

MemeSync is a web application that allows users to create synchronized meme-audio combinations and register them as Intellectual Property (IP) assets on the Story Protocol blockchain.

Features
----------

-   **Meme Upload & Selection**: Upload your own memes or choose from pre-loaded templates

-   **AI Audio Generation**: Generate AI-powered audio tracks or upload your own

-   **Beat Synchronization**: Perfectly sync audio beats with meme timing using intelligent algorithms

-   **Timeline Editor**: Fine-tune synchronization with a visual timeline editor

-   **Real-time Preview**: Preview your synchronized creation before finalizing

-   **Story Protocol Integration**: Register creations as IP assets on the Aeneid testnet

-   **Wallet Integration**: Connect with various Web3 wallets (MetaMask, Coinbase Wallet, etc.)

Architecture
----------------

### Frontend Stack

-   **Next.js 14** with App Router

-   **React** with TypeScript

-   **Tailwind CSS** for styling

-   **shadcn/ui** for UI components

-   **Wagmi** + **Viem** for Web3 interactions

-   **Story Protocol SDK** for IP registration

### Backend Stack

-   **Next.js API Routes** for serverless functions

-   **FFmpeg** for video/audio processing

-   **IPFS** for decentralized storage

-   **Story Protocol Aeneid Testnet** for IP registration

### Key Components

1.  **MemeUploader**: Handles meme selection and upload

2.  **AudioSelector**: Manages audio track selection

3.  **BeatSyncPlayer**: Preview synchronized content

4.  **TimelineEditor**: Visual timeline for fine-tuning

5.  **ExportButton**: Export and register final creation

6.  **IPRegistrationBadge**: Display registration status

🚀 Quick Start
--------------

### Prerequisites

-   Node.js 18+

-   npm or yarn

-   MetaMask or compatible Web3 wallet

-   Story Protocol Aeneid testnet tokens (for IP registration)

### Installation

```bash

# Clone the repository
git clone https://github.com/yourusername/meme-sync.git
cd meme-sync

# Install dependencies
npm install
# or
yarn install

# Set up environment variables
cp .env.example .env.local
```

### Environment Variables

Create a `.env.local` file with:

```env

# Web3 Configuration
NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID=your_walletconnect_project_id

# Story Protocol
NEXT_PUBLIC_SPG_CONTRACT_ADDRESS=your_spg_contract_address
STORY_PRIVATE_KEY=your_private_key_for_contract_creation

# Next.js
NEXT_PUBLIC_APP_URL=http://localhost:3000

# IPFS Configuration (optional)
NEXT_PUBLIC_PINATA_JWT=your_pinata_jwt
NEXT_PUBLIC_PINATA_GATEWAY=https://gateway.pinata.cloud/ipfs/
```

### Running the Application

```bash

# Development
npm run dev
# or
yarn dev

# Build for production
npm run build
npm start
```

Visit `http://localhost:3000` to start using MemeSync.

Usage Guide
--------------

### 1\. Connect Your Wallet

-   Click "Connect Wallet" button

-   Select your preferred wallet provider

-   Ensure you're connected to the Story Protocol Aeneid testnet (Chain ID: 1315)

### 2\. Create a Sync Project

-   **Select a Meme**: Choose from template library or upload your own

-   **Select Audio**: Pick from AI-generated tracks or upload custom audio

-   **Sync Creation**: Click "Sync Meme with Audio" to generate synchronized content

### 3\. Edit & Preview

-   Use the Timeline Editor to adjust synchronization

-   Preview your creation in real-time

-   Make adjustments as needed

### 4\. Export & Register

-   Click "Export & Register" to process your creation

-   The system will:

    -   Generate final video with synchronized audio

    -   Upload metadata to IPFS

    -   Register as IP Asset on Story Protocol

    -   Mint NFT to your wallet

### 5\. View Registration

-   Check the IP Registration Badge for status

-   View your IP Asset on the Story Protocol explorer

-   Share your creation with others

Technical Details
--------------------

### IP Registration Flow

MemeSync uses a sophisticated IP registration process:

typescript

// Key Registration Steps:
1. Metadata Preparation → Generate unique metadata with IPFS hashes
2. IPFS Upload → Store metadata on decentralized storage
3. Direct Contract Call → Use mintAndRegisterIp for custom SPG contracts
4. IP ID Extraction → Parse transaction logs or calculate from token ID
5. Confirmation → Return IP Asset ID and transaction details

### Custom SPG NFT Contract

MemeSync uses a custom SPG (Story Protocol Governance) NFT contract created specifically for the platform:

```typescript

// Contract Creation:
const newCollection = await client.nftClient.createNFTCollection({
  name: "MemeSync Creations",
  symbol: "MSYNC",
  isPublicMinting: true,  // Allows public registration
  mintOpen: true,
  mintFeeRecipient: zeroAddress,
  contractURI: "",
});

```

### Error Handling & Retry Logic

The application implements robust error handling:

-   Multiple registration attempts (with license terms, without, direct contract)

-   Automatic fallback mechanisms

-   Detailed error messages for troubleshooting

-   Transaction simulation before execution

Testing
----------

### Story Protocol Testnet

-   All IP registrations use the Aeneid testnet

-   Test IP tokens available from faucet: <https://docs.story.foundation/aeneid>

-   Test transactions visible on: <https://aeneid-explorer.storyprotocol.xyz>


Security Considerations
--------------------------

1.  **Private Keys**: Never commit private keys to version control

2.  **Wallet Security**: Use browser wallet extensions for transaction signing

3.  **Environment Variables**: Store sensitive data in `.env.local`

4.  **IPFS Content**: Be mindful of what content you upload to decentralized storage

5.  **Testnet Usage**: Always use testnet for development and testing

Contributing
---------------

1.  Fork the repository

2.  Create a feature branch

3.  Make your changes

4.  Add tests if applicable

5.  Submit a pull request

### Development Guidelines

-   Follow TypeScript best practices

-   Use functional components with hooks

-   Implement proper error handling

-   Add comprehensive documentation

-   Write tests for new features

License
----------

This project is licensed under the MIT License - see the [LICENSE](https://LICENSE) file for details.

Acknowledgments
------------------

-   **Story Protocol** for the IP infrastructure

-   **FFmpeg** for media processing capabilities

-   **IPFS** for decentralized storage

-   **shadcn/ui** for beautiful UI components

-   **Wagmi & Viem** for Web3 utilities

Troubleshooting
------------------

### Common Issues

1.  **Wallet Connection Issues**

    -   Ensure wallet is unlocked

    -   Check network (must be Aeneid testnet)

    -   Clear browser cache if needed

2.  **Registration Failures**

    -   Check wallet balance (need IP tokens for gas)

    -   Verify metadata accessibility on IPFS

    -   Ensure SPG contract address is correct

3.  **Video Processing Errors**

    -   Check file formats (supported: MP4, WebM, GIF)

    -   Verify file sizes (limit: 100MB)

    -   Ensure FFmpeg is properly installed

4.  **Network Issues**

    -   Check Story Protocol RPC endpoint availability

    -   Verify IPFS gateway connectivity

    -   Check browser console for detailed errors

### Getting Help

-   Check the browser console for detailed error messages

-   Review transaction details on the Story Protocol explorer

-   Consult the Story Protocol documentation

-   Open an issue on GitHub

Future Enhancements
----------------------

Planned features and improvements:

-   Batch processing for multiple memes

-   Advanced audio effects and filters

-   Collaborative editing features

-   Social sharing integration

-   Advanced licensing options
