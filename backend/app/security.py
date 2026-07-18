import base64
import os

ENCRYPTION_KEY = os.getenv("ENCRYPTION_KEY", "hackathon_secret_key_2026")

def encrypt_value(val: str) -> str:
    """
    Encrypts a string value using XOR cipher and base64 encoding.
    """
    if not val:
        return val
    key = ENCRYPTION_KEY
    xor_bytes = bytearray(val.encode('utf-8'))
    key_bytes = key.encode('utf-8')
    for i in range(len(xor_bytes)):
        xor_bytes[i] ^= key_bytes[i % len(key_bytes)]
    return base64.b64encode(xor_bytes).decode('utf-8')

def decrypt_value(val: str) -> str:
    """
    Decrypts a string value using base64 decoding and XOR cipher.
    Safely falls back to plain text if the value is not encrypted.
    """
    if not val:
        return val
    try:
        # Check if the string is valid base64
        val_bytes = val.encode('utf-8')
        xor_bytes = bytearray(base64.b64decode(val_bytes))
        key = ENCRYPTION_KEY
        key_bytes = key.encode('utf-8')
        for i in range(len(xor_bytes)):
            xor_bytes[i] ^= key_bytes[i % len(key_bytes)]
        return xor_bytes.decode('utf-8')
    except Exception:
        # Fall back to original value if base64 decoding or decoding fails
        return val
