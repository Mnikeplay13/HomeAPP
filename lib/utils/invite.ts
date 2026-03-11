const ALPHABET = "ABCDEFGHJKMNPQRSTUVWXYZ23456789" // exclude confusing chars

export function generateInviteCode(length = 6) {
  let code = ""
  for (let i = 0; i < length; i++) {
    code += ALPHABET[Math.floor(Math.random() * ALPHABET.length)]
  }
  return code
}
