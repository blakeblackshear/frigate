export function base64ToBase64Url(base64encodedStr: string): string {
  return base64encodedStr
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');
}

export function strToBase64Encode(str: string): string {
  return btoa(str);
}

export function base64DecodeToStr(str: string): string {
  return atob(str);
}

export function base64Encode(input: Uint8Array): string {
  return btoa(String.fromCharCode(...input));
}

export function base64UrlEncode(input: Uint8Array): string {
  return base64ToBase64Url(base64Encode(input));
}

export function base64Decode(base64encodedStr: string) {
  return Uint8Array.from(atob(base64encodedStr), (c) => c.charCodeAt(0));
}
