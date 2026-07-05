export function stripAnsi(input: string): string {
  return input.replace(/\x1B(?:[@-Z\\-_]|\[[0-?]*[ -/]*[@-~])/g, "");
}

export function compactWhitespace(input: string): string {
  return input.replace(/\s+/g, " ").trim();
}

export function truncateMiddle(input: string, maxLength: number): string {
  if (input.length <= maxLength) {
    return input;
  }

  const side = Math.floor((maxLength - 3) / 2);
  return `${input.slice(0, side)}...${input.slice(input.length - side)}`;
}

export function includesAny(value: string, patterns: string[]): string | undefined {
  return patterns.find((pattern) => value.includes(pattern));
}

export function normalize(value: string): string {
  return value.toLowerCase();
}
