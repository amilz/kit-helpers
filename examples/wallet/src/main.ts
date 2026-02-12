import { createEmptyClient } from '@solana/kit';
import {
    autoDiscover,
    createSignMessageFromAccount,
    onWalletRegistered,
    walletPlugin,
    type UiWallet,
    type WalletStatus,
} from '@kit-helpers/wallet';

// DOM elements
const statusEl = document.getElementById('status')!;
const addressEl = document.getElementById('address')!;
const connectorsEl = document.getElementById('connectors')!;
const noWalletsEl = document.getElementById('no-wallets')!;
const disconnectBtn = document.getElementById('disconnect') as HTMLButtonElement;
const signSection = document.getElementById('sign-section')!;
const messageInput = document.getElementById('message-input') as HTMLInputElement;
const signBtn = document.getElementById('sign-btn') as HTMLButtonElement;
const signatureEl = document.getElementById('signature')!;
const logEl = document.getElementById('log')!;

// Logging
function log(msg: string) {
    const line = document.createElement('div');
    line.textContent = `> ${msg}`;
    logEl.prepend(line);
}

// Discover wallets
const wallets = autoDiscover();
log(`found ${wallets.length} wallet(s)`);

// Create client with wallet plugin
const client = createEmptyClient().use(walletPlugin({ wallets }));

// Render a single wallet button
function renderWalletButton(wallet: UiWallet) {
    const btn = document.createElement('button');
    btn.className = 'connector-btn';
    btn.dataset.walletName = wallet.name;

    if (wallet.icon) {
        const img = document.createElement('img');
        img.src = wallet.icon;
        img.alt = wallet.name;
        btn.appendChild(img);
    }

    btn.appendChild(document.createTextNode(wallet.name));

    btn.addEventListener('click', () => handleConnect(wallet.name));
    connectorsEl.appendChild(btn);
}

// Render all wallet buttons
function renderWallets(list: readonly UiWallet[]) {
    connectorsEl.innerHTML = '';
    if (list.length === 0) {
        noWalletsEl.style.display = 'block';
    } else {
        noWalletsEl.style.display = 'none';
        for (const wallet of list) {
            renderWalletButton(wallet);
        }
    }
}

// Update the UI based on wallet status
function updateUI(walletStatus: WalletStatus) {
    statusEl.textContent = walletStatus.status;

    switch (walletStatus.status) {
        case 'connected': {
            addressEl.textContent = walletStatus.session.account.address;
            disconnectBtn.classList.remove('hidden');
            signSection.classList.remove('hidden');
            connectorsEl.classList.add('hidden');
            noWalletsEl.style.display = 'none';
            break;
        }
        case 'connecting': {
            addressEl.textContent = '\u2026';
            disconnectBtn.classList.add('hidden');
            signSection.classList.add('hidden');
            break;
        }
        case 'disconnected': {
            addressEl.textContent = '\u2014';
            disconnectBtn.classList.add('hidden');
            signSection.classList.add('hidden');
            signatureEl.textContent = '\u2014';
            connectorsEl.classList.remove('hidden');
            renderWallets(client.wallet.wallets);
            break;
        }
        case 'error': {
            const errMsg =
                walletStatus.error instanceof Error ? walletStatus.error.message : String(walletStatus.error);
            addressEl.textContent = '\u2014';
            disconnectBtn.classList.add('hidden');
            signSection.classList.add('hidden');
            connectorsEl.classList.remove('hidden');
            log(`error: ${errMsg}`);
            break;
        }
    }
}

// Subscribe to wallet status changes
client.wallet.subscribe((walletStatus: WalletStatus) => {
    log(`status: ${walletStatus.status}`);
    updateUI(walletStatus);
});

// Initial render
renderWallets(client.wallet.wallets);

// Listen for late wallet registrations
onWalletRegistered(wallet => {
    log(`new wallet registered: ${wallet.name}`);
    renderWalletButton(wallet);
    noWalletsEl.style.display = 'none';
});

// Connect handler
async function handleConnect(walletName: string) {
    try {
        await client.wallet.connect(walletName);
    } catch (e) {
        const msg = e instanceof Error ? e.message : String(e);
        log(`connect error: ${msg}`);
    }
}

// Disconnect handler
disconnectBtn.addEventListener('click', async () => {
    await client.wallet.disconnect();
});

// Sign message handler
signBtn.addEventListener('click', async () => {
    if (client.wallet.state.status !== 'connected') return;

    const message = messageInput.value;
    if (!message) return;

    try {
        signBtn.disabled = true;
        const session = client.wallet.state.session;
        const signMessage = createSignMessageFromAccount(session.account);
        const sig = await signMessage(new TextEncoder().encode(message));
        // Convert SignatureBytes to hex for display
        const hex = Array.from(sig, b => b.toString(16).padStart(2, '0')).join('');
        signatureEl.textContent = hex;
        log(`signed message: "${message}"`);
    } catch (e) {
        const msg = e instanceof Error ? e.message : String(e);
        signatureEl.textContent = `Error: ${msg}`;
        log(`sign error: ${msg}`);
    } finally {
        signBtn.disabled = false;
    }
});
