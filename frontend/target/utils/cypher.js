export function encode(text, key) {
    if (!key) {
        throw new Error("Key must not be empty");
    }
    const keyBytes = Uint8Array.from(key, c => c.charCodeAt(0));
    const data = new TextEncoder().encode(text);
    const encrypted = new Uint8Array(data.length);
    for (let i = 0; i < data.length; i++) {
        encrypted[i] = data[i] ^ keyBytes[i % keyBytes.length];
    }
    let binary = "";
    for (let i = 0; i < encrypted.length; i++) {
        binary += String.fromCharCode(encrypted[i]);
    }
    return btoa(binary);
}
export function decode(ciphertextB64, key) {
    if (!key) {
        throw new Error("Key must not be empty");
    }
    const keyBytes = Uint8Array.from(key, c => c.charCodeAt(0));
    const binary = atob(ciphertextB64);
    const data = Uint8Array.from(binary, c => c.charCodeAt(0));
    const decrypted = new Uint8Array(data.length);
    for (let i = 0; i < data.length; i++) {
        decrypted[i] = data[i] ^ keyBytes[i % keyBytes.length];
    }
    return new TextDecoder().decode(decrypted);
}
