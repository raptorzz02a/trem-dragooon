/** Alphabet des codes de salon : sans 0/O ni 1/I/L, pour être dicté sans erreur. */
export const CODE_ALPHABET = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
export const CODE_LENGTH = 6;
export function normalizeCode(text) {
    return text.toUpperCase().replace(/[^A-Z0-9]/g, '');
}
export function isValidCode(code) {
    return code.length === CODE_LENGTH && [...code].every((c) => CODE_ALPHABET.includes(c));
}
export function randomCode(random = Math.random) {
    let code = '';
    for (let i = 0; i < CODE_LENGTH; i++)
        code += CODE_ALPHABET[Math.floor(random() * CODE_ALPHABET.length)];
    return code;
}
