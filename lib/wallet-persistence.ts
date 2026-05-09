export const WALLET_AUTOCONNECT_KEY = "signalcred.wallet.autoconnect";
const LEGACY_WALLET_AUTOCONNECT_KEY = "memelaunch.wallet.autoconnect";

export function getWalletReconnectIntent() {
  if (typeof window === "undefined") return false;
  return (
    window.localStorage.getItem(WALLET_AUTOCONNECT_KEY) === "true" ||
    window.localStorage.getItem(LEGACY_WALLET_AUTOCONNECT_KEY) === "true"
  );
}

export function setWalletReconnectIntent(enabled: boolean) {
  if (typeof window === "undefined") return;
  if (enabled) {
    window.localStorage.setItem(WALLET_AUTOCONNECT_KEY, "true");
    window.localStorage.removeItem(LEGACY_WALLET_AUTOCONNECT_KEY);
  } else {
    window.localStorage.removeItem(WALLET_AUTOCONNECT_KEY);
    window.localStorage.removeItem(LEGACY_WALLET_AUTOCONNECT_KEY);
  }
}
