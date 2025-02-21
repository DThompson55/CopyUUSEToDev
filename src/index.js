const axios = require('axios')
const {mySecret, headers} = require('uuseCommons');
const {getAxiosTemplate,fetchAllRecords} = require('uuseCommons');

const testRepeatersCMS  = "Import853"
const testHappeningsCMS = "Import857"
const testNewsLetterCMS = "Import147"
const testEBlastCMS     = "Import433";
const liveRepeatersCMS  = "Events";
const liveHappeningsCMS = "Happenings";
const liveNewsLetterCMS = "NewsLetterContents";
const liveEBlastCMS     = "eBlast";


// bulkDelete(testRepeatersCMS)
//   .then(() => getAll(liveRepeatersCMS)) // Ensure `getAll` is called after `bulkDelete` completes
//   .then(records => {
//     const updatedRecords = records.map(record => {
//       const { _id, _createdDate, _updatedDate, _owner, ...data } = record.data;

//       return {
//         ...record,
//         data: {
//           ...data,
//           oldID: _id // Assign old ID before removing it
//         }
//       };
//     });

//     // Bulk insert the updated records into the test CMS
//     return bulkInsert(testRepeatersCMS, updatedRecords);
//   })
//   .catch(error => {
//     console.error("An error occurred:", error);
//   });


bulkDeletes();
fixOldIDs();

async function fixOldIDs() {
getAll(testRepeatersCMS)
.then (repeaters =>{
  getAll(testHappeningsCMS)
 .then (events =>{
  const oldIDs = new Map(repeaters
          .map(ev => [ev.data.oldID, ev])
          );

  events.forEach(event =>{
    if (event.data.repeatedEventID)
     if (event.data.repeatedEventID !== 'nil'){
      const repeater = oldIDs.get(event.data.repeatedEventID.split('_')[0]);
      const newRepeatedEventID = repeater.data._id+"_"+event.data.repeatedEventID.split('_')[1];
      event.data.repeatedEventID = newRepeatedEventID;

    }
  })
  bulkUpdate(testHappeningsCMS,events)
  console.log("Happy");
  })
})
}


async function bulkDeletes() {
await bulkDelete(testRepeatersCMS)
.then(getAll(liveRepeatersCMS)
  .then(records => {
    records.forEach(
      record=>{
      record.data.oldID = record.data._id;
      delete record.id;
      delete record.dataCollectionId;
      delete record.data._id;
      delete record.data._createdDate;
      delete record.data._updatedDate;
      delete record.data._owner;
      delete record.data["link-repeating-events-all"];
      delete record.data["link-weekly-events-title"];
    });
    bulkInsert(testRepeatersCMS,records);
  }
))

await bulkDelete(testHappeningsCMS)
.then(getAll(liveHappeningsCMS)
  .then(records => {
    records.forEach(
      record=>{
      delete record.id;
      delete record.dataCollectionId;
      delete record.data._id;
      delete record.data._createdDate;
      delete record.data._updatedDate;
      delete record.data._owner;
      delete record.data["link-regular-events-title"];
    })
    bulkInsert(testHappeningsCMS,records);
  }
))

await bulkDelete(testNewsLetterCMS)
.then(getAll(liveNewsLetterCMS)
  .then(records => {
    records.forEach(
      record=>{
      delete record.id;
      delete record.dataCollectionId;
      delete record.data._id;
      delete record.data._createdDate;
      delete record.data._updatedDate;
      delete record.data._owner;
      delete record.data["link-newslettercontents-title"];
      // delete record.data["link-weekly-events-title"];//link-weekly-events-title

    });
    bulkInsert(testNewsLetterCMS,records);
  }
))

await bulkDelete(testEBlastCMS)
.then(getAll(liveEBlastCMS)
  .then(records => {
    records.forEach(
      record=>{
      delete record.id;
      delete record.dataCollectionId;
      delete record.data._id;
      delete record.data._createdDate;
      delete record.data._updatedDate;
      delete record.data._owner;
      delete record.data["link-eblast-1-title"];
      // delete record.data["link-weekly-events-title"];//link-weekly-events-title

    });
    bulkInsert(testEBlastCMS,records);
  }
))
}

async function bulkDelete(target){
  console.log("bulk delete",target)
const options = getAxiosTemplate(target);
    fetchAllRecords(options)
    .then(records => {
        console.log(`Fetched ${records.length} ${target} records.`);
        let dataItemIds = [];
        records.forEach((item)=>{
          dataItemIds.push(item.id);
        })
        var options = getAxiosTemplate(target);
        options.url = '/bulk/items/remove';
        options.data.dataItemIds= dataItemIds
        console.log("there were "+dataItemIds.length+" in",target);
        axios(options)
        .then(function (response2) {
          console.log(target,"is reset");
          return;
        })
        .catch(function (response2) {
          console.log(target,"reset failed");
          return;
        })
    })
}


async function bulkInsert(target,records){
  console.log("bulk insert",target)
const options = getAxiosTemplate(target);
options.url = "/bulk/items/insert";
options.data.dataItems = records;
  axios(options)
  .then(function (response2) {
    console.log(target,"is bulk inserted");
    return;
  })
  .catch(function (response2) {
    console.log(target,"bulk insert failed");
    return;
  })
}

async function bulkUpdate(target,records){
  console.log("bulk update",target)
const options = getAxiosTemplate(target);
options.url = "/bulk/items/update";
options.data.dataItems = records;
  axios(options)
  .then(function (response2) {
    console.log(target,"is bulk updated");
    return;
  })
  .catch(function (response2) {
    console.log(target,"bulk update failed");
    return;
  })
}

async function getAll(target){
  console.log("get All",target)
const options = getAxiosTemplate(target);
return fetchAllRecords(options)
    .then(records => {
        console.log(`Fetched ${records.length} ${target} records.`);
        return records;
    })
    .catch(error => {
        console.error('Error fetching records:', error);
        throw error;
    });
}


