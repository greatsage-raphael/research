const actTitleString = "Act Title: AFRICAN RE-INSURANCE CORPORATION (MANDATORY RE-INSURANCE CESSIONS)";
const actTitle = "Act Title: ";

// Find the position of the Act Title in the string
const actTitleIndex = actTitleString.indexOf(actTitle);

// Extract the words after the Act Title
const wordsAfterTitle = actTitleString.substring(actTitleIndex + actTitle.length);

console.log(wordsAfterTitle); // Output: "AFRICAN RE-INSURANCE CORPORATION (MANDATORY RE-INSURANCE CESSIONS)"