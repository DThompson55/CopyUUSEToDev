  var today = new Date()
  today.getDate();
  today.setHours(0,0,0,0);
  today.setDate(today.getDate() -1);

//  console.log("Dates",new Date(), new Date((new Date()).setHours(0,0,0,0)), today);

  console.log("looking for emails after date", emailSentDate);
  
  const gmail = google.gmail({version: 'v1', auth});
  gmail.users.messages.list({
    userId: 'me',
       q:"after:"+emailSentDate+" from:eblast@uuse.ccsend.com subject:Weekly eBlast" //have to be careful with the subject line
  })
  .then((response) => {	

    if (response.data.resultSizeEstimate > 0) { // was there an email?

      console.log("How Many? There were",response.data.messages.length,"emails from eblast@uuse");

       //Hopefully the most recent is the one with any corrections
       let message = response.data.messages[0];//response.data.messages.length-1];

        gmail.users.messages.get({
    	    userId: 'me',
    	    id:message.id // just get the first one?
    	  })
    	  .then((response) =>{
          //
          // Then we're going to get the second payload part which contains HTML and pass it to our parser.
          //
          const dateObj = response.data.payload.headers.find(obj => obj.name === "Date");

          setDates(dateObj.value);
          console.log("eMail Date    ",emailSentDate,"and as dd-mm",emailSentDate_mm_dd);
          
          const subjectLine = response.data.payload.headers.find(obj => obj.name === "Subject");
          console.log("eMail Subject Line       ",subjectLine.value);

          if (subjectLine) {
       	  	var html = Buffer.from(response.data.payload.parts[1].body.data, 'base64').toString('UTF-8');


            if (argv.capture){
            console.log("Write the HTML to a file");
            fs.writeFile('original.html', html, (err) => {
              if (err) {
                console.error('Error writing to file:', err);
              } else {
                console.log('File written successfully');
              }
            });
            }

             resetOldNews(() => {
               updateDate(emailSentDate_mm_dd2, html, parseEBlastHTML)
             });
          } 
  	  })
    } else {
      console.log("There was no eblast found in gmail for this date",after);
    }
	})