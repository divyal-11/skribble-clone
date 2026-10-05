import fs from "fs";

function loadDictionary(fileName: string): string[] {
  try {
    const fileUrl = new URL(`./dictionaries/${fileName}`, import.meta.url);
    const content = fs.readFileSync(fileUrl, "utf-8");
    return JSON.parse(content) as string[];
  } catch (err) {
    console.error(`⚠️ Failed to load dictionary ${fileName}:`, err);
    return [];
  }
}

export const DICTIONARIES: Record<string, string[]> = {
  English: loadDictionary("english.json"),
  German: loadDictionary("german.json"),
  Spanish: loadDictionary("spanish.json"),
  French: loadDictionary("french.json"),
  Korean: loadDictionary("korean.json"),
};

export const SUPPORTED_LANGUAGES = ["English", "German", "Spanish", "French", "Korean"] as const;
export type SupportedLanguage = typeof SUPPORTED_LANGUAGES[number];

export const WORDS: string[] = DICTIONARIES.English;

/**
 * Returns `count` unique random words from the language bank
 */
export function getRandomWords(count: number = 3, language: string = "English"): string[] {
  // Normalize language title
  const matchedKey =
    Object.keys(DICTIONARIES).find(
      (k) => k.toLowerCase() === language.trim().toLowerCase()
    ) || "English";

  const bank = DICTIONARIES[matchedKey] && DICTIONARIES[matchedKey].length > 0
    ? DICTIONARIES[matchedKey]
    : DICTIONARIES.English;

  const shuffled = [...bank].sort(() => 0.5 - Math.random());
  return shuffled.slice(0, count);
}

/**
 * Transforms a word into masked underscores, leaving revealed letter indices visible:
 * 'apple' with revealed [1] -> '_ P _ _ _'
 * Preserves spaces and hyphens.
 */
export function maskWord(word: string, revealedIndices: number[] = []): string {
  const revealedSet = new Set(revealedIndices);
  return word
    .split("")
    .map((char, index) => {
      if (char === " ") return " ";
      if (char === "-") return "-";
      if (revealedSet.has(index)) return char.toUpperCase();
      return "_";
    })
    .join(" ");
}
