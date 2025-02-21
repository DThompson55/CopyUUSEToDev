  after = argv.date;

  var before = new Date(after)
  before.getDate();
  before.setHours(0,0,0,0);
  before.setDate(before.getDate() +1);
  console.log(before,before.getFullYear(),before.getMonth(),before.getDate())

  var sBefore = before.getFullYear()+"/"+String(before.getMonth() + 1).padStart(2, '0')+"/"+String(before.getDate()).padStart(2, '0');

if (doNotUpdate) console.log("-- in test mode -- writing to",eBlastCMS);
  console.log("Looking for emails after date", after,sBefore);


    //uuseoffice-uuse.org@shared1.ccsend.com
    //q:"after:"+after+" from:uuseoffice@uuse.org"// subject:weekly" have to be careful with the subject line
    //q:"after:"+after+" before:"+"01/27/2024"+" from:eblast@uuse.ccsend.com"// subject:weekly" have to be careful with the subject line
    //q:"before:"+sBefore+"after:"+after+" from:eblast@uuse.ccsend.com subject:UUSE News" //have to be careful with the subject line
