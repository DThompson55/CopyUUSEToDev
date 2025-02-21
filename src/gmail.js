const fs = require('fs');
const {authorize,google} = require('uuseCommons');

/**
*
* We're going to look for any gmail messages that came in since yesterday
* that came from UUSE, and that have the word weekly in the subject line 
* 
*  */
async function getGMail(auth, subject, emailSentDate, capture, callback) {

  console.log("looking for emails after date", emailSentDate);
  console.log("after:"+emailSentDate+` from:eblast@uuse.ccsend.com subject:${subject}`); //have to be careful with the subject line
  console.log(emailSentDate, capture);
  
  const gmail = google.gmail({version: 'v1', auth});
  gmail.users.messages.list({
    userId: 'me',
       q:"after:"+emailSentDate+` from:eblast@uuse.ccsend.com subject:${subject}` //have to be careful with the subject line
//     q:"after:"+emailSentDate+" from:dthompson55@gmail.com"// subject:weekly" have to be careful with the subject line
  })
  .then((response) => {

    if (response.data.resultSizeEstimate > 0) { // was there an email?
      response.data.messages.forEach((message) => {
        gmail.users.messages.get({
    	    userId: 'me',
    	    id:message.id // just get the first one?
    	  })
    	  .then((response) =>{
          //
          // Then we're going to get the second payload part which contains HTML and pass it to our parser.
          //
          
          const subjectLine = response.data.payload.headers.find(obj => obj.name === "Subject");
          console.log("eMail Subject Line       ",subjectLine.value);

          var isNewsLetter = subjectLine.value.toLowerCase().includes("newsletter");
          console.log("isNewsletter?",isNewsLetter);

          if (subjectLine && isNewsLetter) {

            console.log("How many parts?",response.data.payload.parts.length)
            let part = response.data.payload.parts[response.data.payload.parts.length - 1]; // hardcoded to 2

            const dateObj = response.data.payload.headers.find(obj => obj.name === "Date");
            const dateString = dateObj.value
            const dateComponents = dateString.split(" ");
            const dayOfWeek = dateComponents[0];
            const day = parseInt(dateComponents[1]);
            const monthStr = dateComponents[2];
            const year = parseInt(dateComponents[3]);
            const time = dateComponents[4];

            // Convert the month abbreviation to a numeric value
            const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
            const month = months.indexOf(monthStr);

            // Extract the timezone offset
            const timeZoneOffset = dateComponents[5];

            // Create a new date string in a format that Date.parse() can understand
            const formattedDateString = `${months[month]} ${day}, ${year} ${time} ${timeZoneOffset}`;

            // Parse the formatted date string
            let emailSentDatex = new Date(formattedDateString);

            // Create the formatted date string in "dd-mm" format
            emailSentDate_mm_dd = `${((month+1).toString().padStart(2, '0'))}-${(day.toString().padStart(2, '0'))}`;
            emailSentDate_mm_dd2 = `${((month+1).toString().padStart(2, '0'))}/${(day.toString().padStart(2, '0'))}`;

            console.log("eMail Date    ",emailSentDatex,"and as dd-mm",emailSentDate_mm_dd);
            
            const subjectLine = response.data.payload.headers.find(obj => obj.name === "Subject");
            console.log("Subject       ",subjectLine.value);

            var html = Buffer.from(response.data.payload.parts[1].body.data, 'base64').toString('UTF-8');

            if (capture){
              console.log("Writing the HTML to a file");
              fs.writeFile('original.html', html, (err) => {
                if (err) {
                  console.error('Error writing to file:', err);
                } else {
                  console.log('File written successfully');
                }
              });
            }
            callback(html);
          }          
        })
      }) 
      } else {
        console.log(`No ${subject} found in gmail for this week`)
      }
	})
}

module.exports = {getGMail}