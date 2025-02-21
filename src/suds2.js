function extractFutureDate(str) {
    const now = new Date();
    const currentYear = now.getFullYear();
    const monthNames = [
        "January", "February", "March", "April", "May", "June",
        "July", "August", "September", "October", "November", "December"
    ];

    const firstLine = str.split('\n')[0] || '';  // Get the first line or an empty string

    const dateRegex = new RegExp(
        `(?:Sunday|Monday|Tuesday|Wednesday|Thursday|Friday|Saturday)?,?\\s*` +  // Optional day of the week
        `(${monthNames.join("|")})\\s(\\d{1,2})`,  // Month and day
        "i"
    );

    const match = firstLine.match(dateRegex);

    if (match) {
        const month = monthNames.findIndex(
            m => m.toLowerCase() === match[1].toLowerCase()
        );
        const day = parseInt(match[2], 10);

        let extractedDate = new Date(currentYear, month, day);
        
        if (extractedDate < now) {
            extractedDate.setFullYear(currentYear + 1);
        }
        return extractedDate;
    }
    
    return null;  // Return null if no date is found
}


// Example Usage
const input = `Sunday, January 12, 1:00 - 4:00 PM, UUSE Chapel/Rm1 or Zoom
Would you like to know more about Unitarian Universalism and Unitarian Universalist Society East?`;
console.log("SANITY",(input));  // Outputs: Date object for October 15th
console.log("Sanity",extractFutureDate(input));  // Outputs: Date object for January 12


// Example Usage
const input2 = `Sunday, January 12th, 1:00 - 4:00 PM, UUSE Chapel/Rm1 or Zoom
Would you like to know more about Unitarian Universalism and Unitarian Universalist Society East? Please attend our Intro to UU Session.
Rev. Josh Pawelek and the Membership Committee invite you to an informative seminar, which will include:`;
console.log("SANITY",(input2));  // Outputs: Date object for October 15th
console.log("SANITY",extractFutureDate(input2));  // Outputs: Date object for October 15th