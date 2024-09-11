// passwordService.js
export const hashPassword = async (password: string) => {
  const encoder = new TextEncoder();

  // Generate a salt (16 bytes)
  const salt = crypto.getRandomValues(new Uint8Array(16));

  // Import the password as a key
  const key = await crypto.subtle.importKey(
    "raw",
    encoder.encode(password),
    { name: "PBKDF2" },
    false,
    ["deriveBits", "deriveKey"]
  );

  // Derive the key (hash the password using PBKDF2)
  const hashedPassword = await crypto.subtle.deriveBits(
    {
      name: "PBKDF2",
      salt: salt,
      iterations: 100000,
      hash: "SHA-256",
    },
    key,
    256
  );

  return {
    salt: Array.from(salt),
    hashedPassword: Array.from(new Uint8Array(hashedPassword)),
  };
};
