// From https://github.com/darkskyapp/string-hash
export function hash(text: string) {
  let hash = 5381;
  let i = text.length;
  while (i) {
    hash = (hash * 33) ^ text.charCodeAt(--i);
  }

  return (hash >>> 0).toString();
}
