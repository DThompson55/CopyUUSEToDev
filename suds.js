const removeIsBack = (str) => str.replace(/\bis back!?(\s|$)/gi, "").trim();

console.log(removeIsBack("The event IS BACK! Don't miss it."));      // Output: "The event Don't miss it."
console.log(removeIsBack("He is back! and better than ever."));      // Output: "He and better than ever."
console.log(removeIsBack("Your favorite show is back!"));            // Output: "Your favorite show"

