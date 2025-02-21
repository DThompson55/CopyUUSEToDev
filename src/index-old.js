const fs = require('fs');

const {mySecret, headers} = require('uuseCommons');
const {authorize,google} = require('uuseCommons');
const {htmlToRichContent} = require('uuseCommons');
const {formatDateToYYYYMMDD, argv, getOrdinalSuffix, formatDate, generateRandomId } = require('uuseCommons');
const {findStartingContent} = require('uuseCommons');

const findGoodStuff = findStartingContent;
const axios = require('axios')
const parse = require('node-html-parser').parse;

var sortOrder = 0;
const timestamp = new Date().toISOString();    

const divider = {type:"PARAGRAPH",id:"foo",nodes:
              [{type:"TEXT",id:"",nodes:[],
                textData:{text:" ------------------------------ ",
                  decorations:[]}}],
              paragraphData:{textStyle:{textAlignment:"CENTER", type:"BOLD",fontWeightValue:700},indentation:0}};

var allArticles = [];

if (argv.help){
  console.log(argv);
  return;
}

//console.log(argv)

const month = argv.month;

const doNotUpdate   = !(argv.update);
const repeatersCMS  = (doNotUpdate?"Import853":"Events");
const happeningsCMS = (doNotUpdate?"Import857":"Happenings");
const newsLetterCMS = (doNotUpdate?"Import147":"NewsLetterContents");
console.log((doNotUpdate?"NOT UPDATING":"UPDATES ARE ENABLED"))//,doNotUpdate,argv.update)
console.log("Target CMS is",newsLetterCMS);


const emailSentDate = argv.date;

authorize()
 .then(getNewsLetter)
 .catch(console.error);

/**
*
* We're going to look for any gmail messages that came in since yesterday
* that came from UUSE, and that have the word weekly in the subject line 
* 
*  */
async function getNewsLetter(auth) {

  var today = new Date()
  today.getDate();
  today.setHours(0,0,0,0);
  today.setDate(today.getDate() -1);

//  console.log("Dates",new Date(), new Date((new Date()).setHours(0,0,0,0)), today);

  console.log("looking for emails after date", emailSentDate);
  
  const gmail = google.gmail({version: 'v1', auth});
  gmail.users.messages.list({
    userId: 'me',
       q:"after:"+emailSentDate+" from:eblast@uuse.ccsend.com subject:Newsletter" //have to be careful with the subject line
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

            resetExistingArticles(function(){
              parsenewsLetterHTML(html);
            })
          }          
        })
      }) 
      } else {
        console.log("There was no newsLetter found in gmail for this week")
      }
	})
}

//
// This processes a constant contact email
// and turns it into blog entries
//

var collections = [];
var collection = [];

function parsenewsLetterHTML(html){

		root = parse(html);
    var path = findGoodStuff(root);
// console.log(JSON.stringify(allArticles[0],null,2))
// console.log(path);
// console.log(path.innerText);

    findNews(path);
    updateMonth(month);
    updateNewsLetter(allArticles); // the order of these matters
    updateNewsLetterArticles(collections);
	}


// ************************************
// this walks through the CC email constructs
// in order to find news articles
// we have some recursion here, it looks like
//
// <future>
// we could put more effort in here to work with formattings, font size, possibly images
//

function findNews(path){ //callback might just be used for debugging
  console.log("1",path.childNodes.length); 

  var index = 0;
	path.childNodes.forEach(node=>{

      var articles = [];  
      var content = [];
      var layer = 0;
      var style = {};
      var redact = true;
      var savedArticles = [];

      htmlToRichContent(node, content, layer, style, redact, articles);
      articles.push(content); // get the last one
      articles.forEach(article=>{
        if (article.length == 0) return

        try { // somehow TEXT nodes get put where they don't belong outside a P, so we'll skip them?

          // while (article[0].nodes === undefined)
          //   article = article[0];

          while (article[0].nodes.length == 0 ){
            article.shift();
          }
        } catch(error){
          console.log("DEBUG",JSON.stringify(article));
            //console.log('Exiting program...');
            //process.exit(0);  // Successfully terminates the program
          return;
        }
        if (article.length == 0 ) return;
        index++;

        if (index < 4) return;

        allArticles = [...allArticles, ...article];

        if (article.length > 1){
          allArticles.push(divider);
          savedArticles = [...savedArticles, ...article];
          var richcontent = {nodes:savedArticles};
          richcontent.documentStyle={};
          richcontent.metadata = {version:1,createdTimestamp:`${timestamp}`,updatedTimestamp:`${timestamp}`};
          collections.push(richcontent);
          savedArticles = [];
        } else {
          savedArticles = [...savedArticles, ...article];
        }
      })
	})
}

function updateNewsLetterArticles(collections){

  console.log("Updating",collections.length,"articles")
//  console.log("First Title",collections[0].nodes[0].nodes[0].textData.text)

  var i = 0;

  collections.forEach((collection)=>{
    var article = collection.nodes;
    var title = "some title";
    try {
    title = stripQuotes(article[0].nodes[0].textData.text);
    } catch(error){}

//    var title = article[0].nodes[0].textData.text.trim();

    if (title.length < 2)  {
      console.log("Dropping article with a funky title",i,title)
      return; // ignore the first few articles for now, includeing TOC
    } 

    //
    // this try/catch block takes out the title node, 
    // but there could be additional text in that paragraph, 
    // so we want to use that in the body
    //
    try {
    article[0].nodes.shift(); // this removes the first node, the one that we just used as the title.
    if (article[0].nodes.length == 0) article.shift();
  } catch(error){console.log("Shift Error", JSON.stringify(article,null,2))}
    
    let filteredArticle = article.filter(obj => obj.type !== "TEXT"); // in case text followed the header
    console.log("add to newsletter ",title)//,article);
    sortOrder++;
    let richcontent = {nodes:filteredArticle,documentStyle:{},metadata:{version:1,createdTimestamp:`${timestamp}`,updatedTimestamp:`${timestamp}`}}
        
    if (sortOrder == 1){
      title = "Sunday Services Schedule for "+month;
      updateSundays(richcontent)
    }

    filteredArticle.push(append3);
    
// console.log(richcontent);
// process.exit();

    let longPreview = getLongPreviewFromArticle(filteredArticle);
    let shortPreview = getShortPreviewFromArticle(filteredArticle)

    const options = {
    url: '/items',
    method: 'post', 
    baseURL: 'https://www.wixapis.com/wix-data/v2',
    headers: headers,
    data: {
      dataCollectionId: newsLetterCMS,
      dataItem:{data:{title,richcontent,longPreview,sortOrder,month}},
        },
    timeout: 5000, 
    responseType: 'json', 
    responseEncoding: 'utf8',
    } 
  
    updateRepeater(title,richcontent,longPreview,shortPreview);

    //if ((!doNotUpdate) || (newsLetterCMS === "Import147")){
    {
      axios(options)
      .then(function (response) {
        console.log("Added Newsletter Content ",title, response.status);
       })
      .catch(function (error){
       console.log("Newsletter Content Failed",title,error)
      })
    }
  })
}

function updateNewsLetter(theNewsLetter){
  let title = `${month}`+" Newsletter"

  // console.log("Updating the",title,theNewsLetter.length)
  //fconsole.log(JSON.stringify(theNewsLetter,null,2))

  let filteredNewsLetter = theNewsLetter.filter(obj => obj.type !== "TEXT"); // in case text followed the header

  let richcontent = {nodes:filteredNewsLetter,documentStyle:{},metadata:{version:1,createdTimestamp:`${timestamp}`,updatedTimestamp:`${timestamp}`}}

// fs.writeFile('newsletter.wix.txt', JSON.stringify(richcontent), (err) => {
//   if (err) {
//     console.error('Error writing to file:', err);
//   } else {
//     console.log('File written successfully');
//   }
// });


  const options = {
  url: '/items',
  method: 'post', 
  baseURL: 'https://www.wixapis.com/wix-data/v2',
  headers: headers,
  data: {
    dataCollectionId: newsLetterCMS,
    dataItem:{data:{title,richcontent,month}},
      },
  timeout: 5000, 
  responseType: 'json', 
  responseEncoding: 'utf8',
  } 

  //if (!doNotUpdate){
  {
    axios(options)
    .then(function (response) {
      console.log("Added Newsletter Content ",title, response.status);
     })
    .catch(function (error){
     console.log("Newsletter Content Failed",title,error)
    })
  }
}

function stripQuotes(inputString){
const charsToRemove = `"'”“\""`
inputString = inputString.trim();
var pattern;
var result = "";
pattern = new RegExp(`\\s[${charactersToRemove}]`, 'g');
result = result.replace(pattern, ' ');

pattern = new RegExp(`^[${charsToRemove}]+|[${charsToRemove}]+$`, 'g');
result = inputString.replace(pattern, '');

return result;
}

function removeCharsAfterSpace(inputString, charactersToRemove) {
  // Create a regular expression pattern that matches a space followed by any of the defined characters
  const pattern = new RegExp(`\\s[${charactersToRemove}]`, 'g');

  // Replace the matched pattern with just the space
  const result = inputString.replace(pattern, ' ');

  return result;
}

// Example usage:
const inputString = "This is a test string with some # special @ characters";
const charactersToRemove = "#@";

const modifiedString = removeCharsAfterSpace(inputString, charactersToRemove);
//console.log(modifiedString); // Output: "This is a test string with some  special  characters"

function resetExistingArticles( callback ){
  //   if ((doNotUpdate) && (newsLetterCMS !== "Import147")){ // that'll teach em
  //   callback();
  //   return;
  // }

const options = {
  url: '/items/query',
  method: 'post', 
  baseURL: 'https://www.wixapis.com/wix-data/v2',
  headers: headers,
  data: {
    dataCollectionId: newsLetterCMS
  },
  timeout: 5000, 
  responseType: 'json', 
  responseEncoding: 'utf8', 
}
console.log("removing old news");
 {
  axios(options)
    .then(function (searchResponse) {
      let dataItemIds = [];
      searchResponse.data.dataItems.forEach((item)=>{
        dataItemIds.push(item.data._id);
        
      })
      const options = {
      url: '/bulk/items/remove',
      method: 'post', 
      baseURL: 'https://www.wixapis.com/wix-data/v2',
      headers: headers,
      data: {
        dataCollectionId: newsLetterCMS,
        dataItemIds: dataItemIds,
      },
        timeout: 5000, 
        responseType: 'json', 
        responseEncoding: 'utf8', 
      }
      console.log("there were "+dataItemIds.length+" old news")
      
      if (dataItemIds.length == 0){
        callback();
      } else {
      axios(options)
        .then(function (response2) {
          console.log("Newsletter is reset",);
          callback();
        })
        .catch(function (error) {
          console.log("error resetting item ",error);
        });
      }
      })
    .catch(function (error) {
      console.log("failed to find any published Newsletter",error);
      callback();
    });
  }
}

//
// -----------------------------------------------
//

function updateSundays(richcontent){

//   console.log("Updating Sundays",JSON.stringify(node,null,2));

  var ssCounter = 0;
  var service = [];
  var services = [];  

  richcontent.nodes.forEach((node)=>{

    try {
    if (node.type === "PARAGRAPH")
      if (node.nodes[0].textData.decorations[0].type === "BOLD"){
          var serviceCopy = [...service];
          services.push(serviceCopy);
          service = [];
            }
    } catch (err){}//console.log("oops",JSON.stringify(node))}
    service.push(node)
  })
  var serviceCopy = [...service];
  services.push(serviceCopy);
  processServices(services);

}

function processServices(services){
  var count = 0;
  services.forEach((service) =>{
    if ((count++) < 3) return;
    var inputString = service[0].nodes[0].textData.text;
    // Step 1: Remove the suffix (e.g., 'th', 'st', etc.)
    var matchPart = inputString.match(/[A-Za-z]+, [A-Za-z]+ \d+/);
    //console.log(count,inputString,"MatchPart=",matchPart);
    if (matchPart == null) return;
    const datePart = inputString.match(/[A-Za-z]+, [A-Za-z]+ \d+/)[0]; // Extracts "Sunday, October 6"
    // Step 2: Add the current year
    // console.log("---",datePart,month,(datePart.includes("December")),"!!!");

    var currentYear = new Date().getFullYear();
    if (month === 'January'){
      if (datePart.includes("December")){

      } else {
        currentYear++;
      }
    }

    const fullDateString = `${datePart}, ${currentYear}`; // "Sunday, October 6, 2024"

  // Step 3: Create the Date object
  const dateObject = new Date(fullDateString);

  //console.log(dateObject,inputString);

    // const currentYear = new Date().getFullYear(); // Get the current year
    // const fullDateString = `${dateString}, ${currentYear}`; // Append the year to the string
    // const dateObject = new Date(fullDateString);
    //updateService(service,dateObject)
 })
}

function concatenateTextElements(data) {
  let result = '';

  // Start the loop from index 1 to skip the first PARAGRAPH
  for (let i = 0; i < data.length; i++) {
    const item = data[i]; 
    if (item.type === 'PARAGRAPH') {
      // For each paragraph, go through its nodes
      //console.log(JSON.stringify(item.nodes));
      item.nodes.forEach(node => {
        if (node.type === 'PARAGRAPH'){result += (' '+concatenateTextElements(node))} else
        if (node.type === 'TEXT' && node.textData && node.textData.text) {
          // Add the text content to the result string
          result += node.textData.text;
        }
      });
    }
  }

  return result.trim();
}


function updateService(service, date){

  console.log("Updating Service Desription for",date);
  var title = "";
  var i = 0;

  var hasItalic = false;

  service[0].nodes.forEach((node)=>{
    if (hasItalic) return;
    if ( i++ > 0){
      var text = (node.textData.text);
      if (!((i == 2) && (text === ": ")))
        title += text;
      var decorations = node.textData.decorations;
      hasItalic = decorations.some(
        decoration => ((decoration.type === 'ITALIC') && (decoration.italicData === true)))
    }

    // console.log("Is ITALIC?",node.textData.text,decorations,hasItalic);
    // if (hasItalic) return;
  })

  console.log("Title is",title);

// const daysOfWeek = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];

// const startsWithDay = daysOfWeek.some(day => title.startsWith(day));

//   if (!(startsWithDay)){
//     console.log("Service Description doesn't start with DOW",title)
//     return;
//   } 

  var remainingText = concatenateTextElements(service);
  //    process.exit()
  // if ( remainingText.includes(title)){
  //   remainingText = remainingText.replace(title, "");
  // }
  title = title.trim().replace(/^[\p{P}\p{Zs}]+|[\p{P}\p{Zs}]+$/gu, '')
  remainingText = remainingText.trim().replace(/^[\p{P}\p{Zs}]+|[\p{P}\p{Zs}]+$/gu, '');

  remainingText +="\n#"+month+"Newsletter";
  console.log("SUNDAY SERVICE DESCRIPTION",title,"\n\n",remainingText);


  //service.pop();
  var article = service;
  article.push(append3)


  // console.log("TITLE IS",title);
  // console.log("ARTICLE IS",article);

  const formattedDate = formatDate(date);

const options = {
  url: '/items/query',
  method: 'post', 
  baseURL: 'https://www.wixapis.com/wix-data/v2',
  headers: headers,
  data: {
    dataCollectionId: happeningsCMS,
    query: {
        filter: {
          date:{ $eq : formattedDate},
          isExpired: {$ne: true},
          isService: {$eq: true}
        },
        paging: {
            limit: 1
        }
    }
  },
  timeout: 5000, 
  responseType: 'json', 
  responseEncoding: 'utf8', 
}
    console.log("Sunday Service Search",title,formatDate(date),date);//JSON.stringify(response.data));

axios(options)
  .then(function (response) {

    //
    // Currently Sunday Services only use regular text
    //

    if (response.data.dataItems.length == 0 ){
      console.log("No Sunday Service entry for ",title)
       throw new Error(`Exception: No Sunday Service entry for,"${title}", ${formattedDate}, ${date} `);
    }

    response.data.dataItems.forEach((item)=>{
      item.data.longdescription = remainingText;
      item.data.generatedDescription = remainingText;
      item.data.richcontent = {};
      item.data.richcontent.nodes = article;
      item.data.richcontent.documentStyle = {};
      item.data.richcontent.metadata = {version:1,createdTimestamp:`${timestamp}`,updatedTimestamp:`${timestamp}`};
      item.data.title = title;

//      console.log(item.data.title, "updating", article);
        //item.data._updatedDate.$date,"can we change it?",
      //   (new Date(item.data._updatedDate.$date) < new Date(emailSentDate)),
      //   "metadata",item.data.richcontent.metadata,
      //   "docStyle",item.data.richcontent.documentStyle,
      //   );


    const options = {
      url: '/items/'+item.id,
      method: 'put', 
      baseURL: 'https://www.wixapis.com/wix-data/v2',
      headers: headers,
      data: {
        dataCollectionId: happeningsCMS,
        dataItem:item,
      },
      timeout: 5000, 
      responseType: 'json', 
      responseEncoding: 'utf8', 
    }

//    if ((!doNotUpdate) || (happeningsCMS === "Import857")) {// double safety lock?
    {
        axios(options)
        .then(function (response) {
          console.log("Updated Sunday",response.data.dataItem.data.title)
        })
      } //else console.log("Sunday Article",article);
    })
  })
}


function getTextFromArticle(article){
  let associatedText = "";
  article.forEach((node) =>{
    if (node.type === "PARAGRAPH"){
      let paragraph = node;
      paragraph.nodes.forEach((node) =>{
        if (node.type === "TEXT"){
          associatedText += node.textData.text;
        }
      })
      associatedText += "\n";
    }
  })
  var s = associatedText.trim();
  return s;
}

function getLongPreviewFromArticle(article){
  let s = getTextFromArticle(article);
  var lines = s.split('\n');
  s = lines.join('\n');
  return s;
}

function getShortPreviewFromArticle(article){
let s = getLongPreviewFromArticle(article);
//  var lines = s.split('\n');
  // if (lines.length > 1) {
  //     lines.shift(); // Remove the first blank line
  // }
//console.log(lines);
  // s = lines.join('\n').slice(0, 180);
  // s = s+"...";
  //console.log("Preview",s);
  return s;
}


function updateMonth(month){
  var title = "Newsletter";

  if (newsLetterCMS !== "NewsLetterContents"){
    title="devNewsletter"
  }

  console.log("Property CMS Entry updating",title);

  const options = {
  url: '/items/query',
  method: 'post', 
  baseURL: 'https://www.wixapis.com/wix-data/v2',
  headers: headers,
  data: {
    dataCollectionId: "Properties",
    query:{
    filter: {
      title:{ $eq : title }
    }
  }
  },
  timeout: 5000, 
  responseType: 'json', 
  responseEncoding: 'utf8', 
}
  axios(options)
    .then(function (searchResponse) {
      if (searchResponse.data.dataItems.length!= 1){
        console.log("Properties CMS Entry not found for",title);
      }
      let item = searchResponse.data.dataItems[0];
      item.data.value = month+" Newsletter";

    const options = {
      url: '/items/'+item.id,
      method: 'put', 
      baseURL: 'https://www.wixapis.com/wix-data/v2',
      headers: headers,
      data: {
        dataCollectionId: "Properties",
        dataItem:item,
      },
      timeout: 5000, 
      responseType: 'json', 
      responseEncoding: 'utf8', 
    }  
    axios(options)
    .then(function (response) {
      console.log("Updated Newsletter Month in Properties CMS ",month, response.status);
     })
    .catch(function (error){
     console.log("Newsletter Month Set Failed",title,error)
    })
  })
}


//console.log(JSON.stringify(getTemplate("STARTS")));

function getTemplate(title){
var template ={"nodes":[{"type":"PARAGRAPH","id":"foo","nodes":[{"type":"TEXT","id":"","nodes":[],"textData":{"text":`There is no ${title} this month.`,"decorations":[]}}],"paragraphData":{"textStyle":{"textAlignment":"AUTO"},"indentation":0}}],"metadata":{"version":1,"createdTimestamp":`${timestamp}`,"updatedTimestamp":`${timestamp}`},"documentStyle":{}}
return template;
}

const append1 = {type:"PARAGRAPH",id:"foo",nodes:
              [{type:"TEXT",id:"",nodes:[],
                textData:{text:" ",
                  decorations:[]}}],
              paragraphData:{textStyle:{textAlignment:"AUTO"},indentation:0}};


const append3 = {type:"PARAGRAPH",id:"foo",dtt:"dtt",nodes:
              [{type:"TEXT",id:"",nodes:[],
                textData:{text:"#"+month+"Newsletter",
                  decorations:[]}}],
              paragraphData:{textStyle:{textAlignment:"AUTO"},indentation:0}};



// function findFirstValidWord(words) {
//   for (let word of words) {
//     if (word.length >= 3 && word !== "UUSE") {
//       return word;
//     }
//   }
//   return ""; // Return null if no valid word is found
// }

function updateRepeater(title,article,longPreview,shortPreview){

  var searchTerm = title.replace(/\bUUSE\b\s*/g, "").trim();
  if (searchTerm.includes("Choir")) {
    console.log("Choir found");
    searchTerm = "Choir";
  }

  searchTerm = searchTerm.replace(/\bis back!?(\s|$)/gi, "").trim();
  console.log("Search Term is",searchTerm);

const options = {
  url: '/items/query',
  method: 'post', 
  baseURL: 'https://www.wixapis.com/wix-data/v2',
  headers: headers,
  data: {
    dataCollectionId: repeatersCMS,
    query:{
    filter: {
      title:{ $startsWith : searchTerm }
    }
  }
  },
  timeout: 5000, 
  responseType: 'json', 
  responseEncoding: 'utf8', 
}

axios(options)
  .then(function (response) {
    console.log("Searching for Repeater using '"+searchTerm+"' found",response.data.dataItems.length)
    response.data.dataItems.forEach((item)=>{

    // console.log("Repeater",title,response.status,response.data.dataItems.length);
    // console.log(JSON.stringify(article))


      //if (remainingText == item.data.longdescription) return;

      console.log("Repeater Found",item.data.title);
      // console.log("--",item.data.longdescription);
      // console.log("--",remainingText);
      // console.log("---",remainingText == item.data.longdescription);

      item.data.longdescription = longPreview;
      item.data.richcontent = article;
      item.data.richcontent.documentStyle = {};
      item.data.richcontent.metadata = {version:1,createdTimestamp:`${timestamp}`,updatedTimestamp:`${timestamp}`};

    const options = {
      url: '/items/'+item.id,
      method: 'put', 
      baseURL: 'https://www.wixapis.com/wix-data/v2',
      headers: headers,
      data: {
        dataCollectionId: repeatersCMS,
        dataItem:item,
      },
      timeout: 5000, 
      responseType: 'json', 
      responseEncoding: 'utf8', 
    }
//    if ((!doNotUpdate) || (repeatersCMS === "Import853")) {// double safety lock?
    {
    axios(options)
    .then(function (response) {
      console.log("Updated Repeating Event",response.data.dataItem.data.title)
      updateEventsCalendar(searchTerm, title, longPreview, shortPreview, article)

    })
  }
    })
  })
}


function updateEventsCalendar(searchTerm, title, longPreview, shortPreview, richcontent){

console.log("Try to Update Calendar with",searchTerm);
let foundDate = extractFutureDate(longPreview);  // Outputs: Date object for March 5th of the correct year
if (foundDate){
  foundDate = formatDateToYYYYMMDD(foundDate);
  console.log("FOUND DATE",foundDate)
}
const options = {
  url: '/items/query',
  method: 'post', 
  baseURL: 'https://www.wixapis.com/wix-data/v2',
  headers: headers,
  data: {
    dataCollectionId: happeningsCMS,
    query: {
        filter: {
          title:{ $startsWith: searchTerm },
          isExpired: {$ne: true},
          isService: {$ne: true}
        },
        paging: {
            limit: 2
        }
    }
  },
  timeout: 5000, 
  responseType: 'json', 
  responseEncoding: 'utf8', 
}

console.log("_find Happenings ",searchTerm)
axios(options)
  .then(function (response) {

//  if (response.data.dataItems.length > 0) 
    console.log((doNotUpdate?"x":" "),"Event Updating ",searchTerm, title,response.status,"found",response.data.dataItems.length);

    response.data.dataItems.forEach((item)=>{
      item.data.longdescription = longPreview;
      item.data.generatedDescription = shortPreview;
      item.data.richcontent = richcontent;
      item.data.richcontent.documentStyle = {};
      item.data.richcontent.metadata = {version:1,createdTimestamp:`${timestamp}`,updatedTimestamp:`${timestamp}`};

      if ( title.includes("Ladies at Lunch") ){
        const regex2 = /\bFriday\b/gi; // \b matches word boundaries
        if (regex2.test(item.data.longdescription)) {
          sDate = item.data.date.replace(/-/g, '/'); // fix date format so javascript doesn't barf
          //console.log("LAL Found a Friday in longdescription",sDate);
          let date = new Date(sDate)
          //console.log("LAL existing DOW is",date.getDay());
          //console.log("LAL date was",date.toISOString().split('T')[0]);
          if (date.getDay() == 4) { // is the date set to a Thursday?
              date.setDate(date.getDate() + 1)        // if not, let's bump the date by one and try again, maybe friday?
              console.log("  LAL date       changed to",date.toISOString().split('T')[0]);
              item.date = date.toISOString().split('T')[0];
          } else {
            //console.log("  LAL date       unchanged")
          }
        } 
      }

    const options = {
      url: '/items/'+item.id,
      method: 'put', 
      baseURL: 'https://www.wixapis.com/wix-data/v2',
      headers: headers,
      data: {
        dataCollectionId: happeningsCMS,
        dataItem:item,
      },
      timeout: 5000, 
      responseType: 'json', 
      responseEncoding: 'utf8', 
    }
    //if ((!doNotUpdate) && (eBlastCMS !== "Import433"))
    axios(options)
    .then(function (response) {
      console.log("  Updated Event ",response.data.dataItem.data.title)
    })
    .catch(function (error){
      console.log("Update Event Failed",error.response.status,error.response.statusText,error.response.data)
    })

    })
  })
}

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
