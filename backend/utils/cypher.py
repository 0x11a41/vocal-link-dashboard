import secrets
import base64

def decode(ciphertext_b64: str, key: str) -> str:
    data = base64.b64decode(ciphertext_b64)

    decrypted = bytes(
        [b ^ ord(key[i % len(key)]) for i, b in enumerate(data)]
    )

    return decrypted.decode("utf-8")


def encode(text: str, key: str) -> str:
    if not key:
        raise ValueError("Key must not be empty")

    encrypted_bytes = bytes(
        [ord(c) ^ ord(key[i % len(key)]) for i, c in enumerate(text)]
    )

    return base64.b64encode(encrypted_bytes).decode("utf-8")


def get_key(length: int = 24) -> str:
    return base64.b64encode(secrets.token_bytes(length)).decode("utf-8")
