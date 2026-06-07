/** Split text into reveal units — keep $...$ math blocks intact. */
export function buildTypewriterUnits(text: string): string[] {
  const units: string[] = [];
  for (let i = 0; i < text.length; ) {
    if (text[i] === "$") {
      const end = text.indexOf("$", i + 1);
      if (end !== -1) {
        units.push(text.slice(i, end + 1));
        i = end + 1;
        continue;
      }
    }
    units.push(text[i]);
    i += 1;
  }
  return units;
}
