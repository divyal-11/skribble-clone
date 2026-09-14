export const WORDS: string[] = [
  // Animals
  'cat', 'dog', 'elephant', 'giraffe', 'penguin', 'lion', 'dolphin', 'monkey', 'rabbit', 'snake',
  // Food & Drinks
  'pizza', 'burger', 'ice cream', 'apple', 'banana', 'cookie', 'coffee', 'sandwich', 'cake', 'sushi',
  // Objects & Tools
  'guitar', 'camera', 'umbrella', 'clock', 'hammer', 'pencil', 'scissors', 'laptop', 'backpack', 'key',
  // Nature & Places
  'mountain', 'sun', 'moon', 'rainbow', 'volcano', 'island', 'tree', 'cloud', 'ocean', 'campfire',
  // Vehicles
  'airplane', 'bicycle', 'rocket', 'submarine', 'helicopter', 'bus', 'train', 'skateboard'
];

/**
 * Returns `count` unique random words from the bank
 */
export function getRandomWords(count: number = 3): string[] {
  const shuffled = [...WORDS].sort(() => 0.5 - Math.random());
  return shuffled.slice(0, count);
}
