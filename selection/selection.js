const electron = require('electron')
const path = require('path');
const {ipcRenderer} = electron
const fs = require('fs');
const utils = require('../utils.js');
const querystring = require('querystring');
let query = querystring.parse(global.location.search);

let rawdirectory = ''

let items = 0

async function readDirectory(){
  //alert("234")
  jQuery('#videoContainer').empty() 
  items = await fs.readdirSync(rawdirectory)
///  console.log(items)
  for (var i=0; i<items.length; i++) {

    if(utils.getFileExtension(items[i]) == 'jpg'){
   //   console.log(getVideoName(i))
      if(getVideoName(i) != 'NOVIDEO'){
       jQuery('#videoContainer').append(`<img class="p-2 videoitem" date="${getFileinfo(getVideoName(i)).ctime}"  value="${getVideoName(i)}" src="${rawdirectory}/${items[i]}"></img>`)

      }
    }
  }
}
function getFileinfo(vname){

  const info = fs.statSync(`${rawdirectory}/${vname}`);
  return info
}
function getVideoName(index){

  let filename = items[index].slice(0,items[index].lastIndexOf("."))
  let returnVal = 'NOVIDEO'
  items.forEach(element => {
    if(element.slice(0,element.lastIndexOf(".")) == filename && utils.getFileExtension(element) != 'jpg')
    {
      returnVal =  element
    }
  });
  return returnVal
}
$(document).on('click','img.videoitem',function(e){
  let cls = e.target.attributes[0].value
  if(cls.indexOf('disable') != -1){
    alert("This video is processing!")
    return
  }
  ipcRenderer.send('__itemSelected',{
    'name'    :e.target.attributes[2].value,
    'ctime'   :e.target.attributes[1].value,
  })

})
ipcRenderer.on('rawVideoChanged',function(){
  readDirectory()
})
ipcRenderer.on('processing',function(event,item){
  //alert('234')
  
  jQuery('#processcnt').empty()
  jQuery('#processcnt').append(item.jobs.length)
  for(var i = 0;i < item.jobs.length;i++)
  {
    let name = item.jobs[i].name
    jQuery( "img[value='" + name + "']" ).addClass('disable')
  }
})
ipcRenderer.on('uploadCnt',function(event,item){
  jQuery('#uploadcnt').empty()
//  console.log(item)
  jQuery('#uploadcnt').append(item.cnt)
})
ipcRenderer.on('itempushed',function(event,item){
  
})
ipcRenderer.on('error',function(event,item){
  /*
  console.log("-----------")
  console.log(item)
  console.log(item.err)
  console.log("+++++++++++")
  */
})
jQuery( document ).ready( function( $ ) {
  // Code that uses jQuery's $ can follow here.
  let param = JSON.parse(query['?data'])
  rawdirectory = param.rawdirectory
  readDirectory()
});