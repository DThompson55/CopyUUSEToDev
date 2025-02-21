function updateNewsLetter(theNewsLetter){
  let title = `${month}`+" Newsletter"

  // console.log("Updating the",title,theNewsLetter.length)
  //fconsole.log(JSON.stringify(theNewsLetter,null,2))

  let filteredNewsLetter = theNewsLetter.filter(obj => obj.type !== "TEXT"); // in case text followed the header

  let richcontent = {nodes:filteredNewsLetter,documentStyle:{},metadata:{version:1,createdTimestamp:`${timestamp}`,updatedTimestamp:`${timestamp}`}}

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