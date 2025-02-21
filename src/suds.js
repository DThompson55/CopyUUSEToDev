//
// This only updates expired events with new information from Repeater
// OR it creates new events from a Repeater.
//

import wixData from 'wix-data';

var not_happenings = [];
var repeatHappenings = [];
const dom = [[[],[],[],[],[],[],[]],[[],[],[],[],[],[],[]]];
const days = ["sunday","monday","tuesday","wednesday","thursday","friday","saturday"];
const suffix = ["", ".", " .", "!", "-"];
const happeningTemplate = {title: "",
 						   date: "",
						   isExpired: false,
						   isService: false,
						   isFeatured: false,
						   longdescription: "",
						   generatedDescription: "",
						   imageField: null,
						   repeatedEventID: "" };

export function updateRepeatingEvents() {
	setupDOMList();
	wixData.query('Happenings')
	.isNotEmpty('repeatedEventID')
    .and(wixData.query('Happenings').ne('repeatedEventID',"nil"))
	.limit(200)
    .find()
    .then((hResults) => {
		repeatHappenings = hResults.items;
		console.log("This many eligible events",repeatHappenings.length);
		wixData.query('Events')
		.find()
		.then((results) => {
			var today = new Date();
			today.setHours(0,0,0,0);
			results.items.forEach((event)=>{
				console.log("event title "+event.title);
				if (event.isDisabled) return;
				if (event.doNotShowInUpcomingList) return;

				var d = event.dayOfWeek; 
				if (d === undefined) return;
				if ( d == 7 ) d = 0; 					    // take care of sunday
				var wom = event.weekOfMonth;		        // 0 means every week, otherwise the week of the month.
				if (wom === undefined) return;
				console.log(event.title,"wom=",wom,"d=",d);

				if (wom == 0){
					try { 			
						let n = 4;	// prevent more than 4, but this isnt' right
						let uniquifier = 0;
						for (let w = 0 ; w < (dom[0][d]).length ; w++){ // add this month's events
							var x = (dom[0][d])[w];
//							console.log(x,today,((x >= today)));
							if (x >= today){ // this logic could be wrong with funny Wix dates
//								console.log("A Repeat for THIS Month for",event.title,(dom[0][d])[w],w,n);
								setCalendar(event,(dom[0][d])[w],w);
								n--;
							}
						}
						for (let w = 0 ; w < n ; w++){ // add some of next month's events
//							console.log("A Repeat for Next Month for",event.title,(dom[1][d])[w],w,n);
							setCalendar(event,(dom[1][d])[w],w);
						}
					} catch(err){console.log("end of month")} 		
				} else {
					let x = (dom[0][d])[wom-1];
//					console.log("A single Monthly Repeat for",event.title,(dom[0][d])[wom-1],"or next month",(dom[1][d])[wom-1]);
					if ( x >= today ) {
						setCalendar(event,(dom[0][d])[wom-1],99); // this month
					} else {
						setCalendar(event,(dom[1][d])[wom-1],99); // next month
					}
				}
			})
			wixData.bulkUpdate("Happenings", repeatHappenings)
			.then((results) => {
				let inserted = results.inserted; // 0
				let insertedIds = results.insertedItemIds; // []
				let updated = results.updated; // 2
				let skipped = results.skipped; // 0
				let errors = results.errors; // []
				console.log("Happenings Bulk Updated",results);
			})
			.catch((err) => {
				let errorMsg = err;
				console.log("Happenings Bulk Error",err);
			});

		})
	.catch((error) => {
		console.log("query events error",error);
	});
	});
}

//
//
//

function dateToYYMMDD(currentDate){
const year = currentDate.getFullYear();
const month = String(currentDate.getMonth() + 1).padStart(2, '0'); 
const day = String(currentDate.getDate()).padStart(2, '0');
return `${year}-${month}-${day}`;
}

//
// ----------
//

function setCalendar(anEvent, aDate, uniquifer){
	
	if (!(isEffective(anEvent, aDate))) return;

	var key = anEvent._id+"_"+uniquifer;
	var aHappening = repeatHappenings.find(obj => obj.repeatedEventID === key);
	
	if (aHappening){
		if (aHappening.isExpired){
		console.log("UPDATE existing expired happening",aHappening.title)
		aHappening.date = dateToYYMMDD(aDate);
		aHappening.isExpired = false;
		aHappening.longdescription = anEvent.longdescription;
		aHappening.generatedDescription = anEvent.longdescription;
		aHappening.imageField = anEvent.image;
		}

	} else {
		console.log("Add NEW happening",anEvent.title);
		let aHappening = JSON.parse(JSON.stringify(happeningTemplate));
		aHappening.title = anEvent.title;
		aHappening.date = dateToYYMMDD(aDate);
		aHappening.isExpired = false;
		aHappening.isService = false;
		aHappening.isFeatured = false;
		aHappening.longdescription = anEvent.longdescription;
		aHappening.generatedDescription = anEvent.longdescription;
		aHappening.imageField = anEvent.image;
		aHappening.repeatedEventID = key;
		// insert here
		wixData
		.insert("Happenings", aHappening)
		.then((item) => {
			console.log(item); //see item below
		})
		.catch((err) => {
			console.log(err);
		});
	}
}
 
function isEffective(anEvent, aDate){
	var effDate = null;
	if (anEvent.effectiveDate) effDate = new Date(anEvent.effectiveDate);
	var expDate = null;
	if (anEvent.expirationDate) expDate = new Date(anEvent.expirationDate);

	if (effDate && expDate){
		if (effDate > expDate){
			if (( aDate >= expDate) && ( aDate < effDate)) return false; // expired but not effective yet
		} else {
			if (( aDate < effDate) || ( aDate >= expDate)) return false; // not effective yet or expired
		}
	} else 	if (effDate){
			if ( aDate < effDate)  return false; // not effective yet
	} else 	if (expDate){
			if ( aDate >= expDate)  return false; // expired 
	} 
	return true;
 }

function setupDOMList(){
	var td = new Date();
	td.setHours(0,0,0,0);

	//
	// This builds a list of the n'th day of the month
	// so if you want the 2nd tuesday, you go to the 2nd cell, 
	// and the 2nd element there, and that gives you the date
	//
	var mon = td.getMonth()

	console.log("Recurring Dates for THIS Month month",td.getMonth(),td.getFullYear(),"today is a",days[td.getDay()]);

	var i; // count a year's worth of weeks
	for (i = 1 ; i < 32; i++){ // there are never more than 31 days in a month
		td.setDate(i);  //  first day of the month
		var dow = td.getDay();
		if (mon != td.getMonth()){
			break;
		}
		dom[0][dow].push(new Date(td));
	}
	// next month
	td.setDate(1)
	if (mon == 11){
		td.setFullYear(td.getFullYear()+1);
		td.setMonth(0);
	} else {
		td.setMonth(mon+1)
	}
//	console.log("Recurring Dates for Next Month month",td.getMonth(),td.getFullYear(),"falls on",days[td.getDay()]);
	mon = td.getMonth()
	for (i = 1 ; i < 32; i++){  // there are never more than 31 days in a month
		td.setDate(i);  //  first day of the month
		var dow = td.getDay();
		if (mon != td.getMonth()){
			break;
		}
		dom[1][dow].push(new Date(td));
	}
}