/**
 * Calculate words per minute (WPM).
 * @param correctChars Number of correctly typed characters.
 * @param elapsedTime Elapsed time in seconds.
 * @returns WPM as a number.
 */
export const calculateWPM = (
    correctChars: number,
    elapsedTime: number
): number => {
    const words = correctChars / 5; // Assume 1 word = 5 characters
    const minutes = elapsedTime / 60;
    return Math.round(words / minutes);
};

/**
 * Calculate accuracy.
 * @param correctChars Number of correctly typed characters.
 * @param totalChars Total number of characters typed.
 * @returns Accuracy as a percentage (0-100).
 */
export const calculateAccuracy = (
    correctChars: number,
    totalChars: number
): number => {
    if (totalChars === 0) return 100; // Avoid division by zero
    return Math.round((correctChars / totalChars) * 100);
};

/**
 * Calculate error rate.
 * @param incorrectChars Number of incorrectly typed characters.
 * @param totalChars Total number of characters typed.
 * @returns Error rate as a percentage (0-100).
 */
export const calculateErrorRate = (
    incorrectChars: number,
    totalChars: number
): number => {
    if (totalChars === 0) return 0; // Avoid division by zero
    return Math.round((incorrectChars / totalChars) * 100);
};

/**
 * Calculate elapsed time.
 * @param startTime Start time in milliseconds (from Date.now()).
 * @returns Elapsed time in seconds.
 */
export const calculateElapsedTime = (startTime: number): number => {
    const now = Date.now();
    return (now - startTime) / 1000; // Convert milliseconds to seconds
};

/**
 * Count correct and incorrect characters.
 * @param typedText The text typed by the user.
 * @param targetText The target text to compare against.
 * @returns An object with correctChars and incorrectChars.
 */
export const countCorrectAndIncorrectChars = (
    typedText: string,
    targetText: string
): { correctChars: number; incorrectChars: number } => {
    let correctChars = 0;
    let incorrectChars = 0;

    for (let i = 0; i < typedText.length; i++) {
        if (typedText[i] === targetText[i]) {
            correctChars++;
        } else {
            incorrectChars++;
        }
    }

    return { correctChars, incorrectChars };
};

/**
 * Calculate progress.
 * @param typedText The text typed by the user.
 * @param targetText The target text to compare against.
 * @returns Progress as a percentage (0-100).
 */
export const calculateProgress = (
    typedText: string,
    targetText: string
): number => {
    if (targetText.length === 0) return 100; // Avoid division by zero
    return Math.round((typedText.length / targetText.length) * 100);
};

/**
 * Calculate net WPM.
 * @param wpm Words per minute.
 * @param errorRate Error rate as a percentage (0-100).
 * @returns Net WPM as a number.
 */
export const calculateNetWPM = (wpm: number, errorRate: number): number => {
    const penalty = errorRate / 100; // Convert error rate to a fraction
    return Math.round(wpm * (1 - penalty));
};
