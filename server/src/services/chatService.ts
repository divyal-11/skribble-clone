export function levenshteinDistance(a: string, b: string): number {
    const matrix: number[][] = [];

for (let i = 0; i <= b.length; i++) matrix[i] = [i];
  for (let j = 0; j <= a.length; j++) matrix[0][j] = j;
  for (let i = 1; i <= b.length; i++) {
    for (let j = 1; j <= a.length; j++) {
      if (b.charAt(i - 1) === a.charAt(j - 1)) {
        matrix[i][j] = matrix[i - 1][j - 1];
      } else {
        matrix[i][j] = Math.min(
          matrix[i - 1][j - 1] + 1, // substitution
          matrix[i][j - 1] + 1,     // insertion
          matrix[i - 1][j] + 1      // deletion
        );
      }
    }
  }
  return matrix[b.length][a.length];
}

//return true if  guess is 1 character edit away from the target word
export function isCloseGuess(guess: string, targetWord: string): boolean {
  if(guess.length<3) return false;
  return levenshteinDistance(guess.toLowerCase(), targetWord.toLowerCase())===1;
}

//awards score based on how quikly the player guessed
export function calculateGuessScore(timeLeftSeconds: number, maxTime: number = 60): number {
  const ratio = Math.max(0, Math.min(1, timeLeftSeconds / maxTime));
  return Math.round(100 + ratio * 400);
}