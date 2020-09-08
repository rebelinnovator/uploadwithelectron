const electron = require('electron')
const {ipcRenderer} = electron
const querystring = require('querystring');

let rawdirectory = ''
let tempdirectory = ''
let thumbpath = 'thumb.jpg'

let query = querystring.parse(global.location.search);

let globalinfo = 0
let fileinfo = 0

$('#openCropper').on('click',function(e){

  //alert(selData.id)
  e.preventDefault()
  
  ipcRenderer.send('__itemCrop',fileinfo)
})
ipcRenderer.on('cropped',function(e,item){
  fileinfo.crop = item
})
ipcRenderer.on('thumbCreated',function(e,item){
//  console.log('done')
//  $('#tileimg').append('<img style="width:100%;" src="' + rawdirectory + thumbpath + '"></img>')
  $('#tileimg').append(`<img style="width:100%;" src="${rawdirectory}/${thumbpath}"></img>`)

})
ipcRenderer.on('listReset',function(e,data){
  showList(data.cinfo)
})

$('#reload').on('click',function(e){
  e.preventDefault()
  ipcRenderer.send('__reload')
})
$('#push').on('click',function(e){
  e.preventDefault()
  //alert($("#category").val())
  //fileinfo.name = $("#title").val()
  fileinfo.newname = $("#title").val()
  fileinfo.date = $('#date').val()
  fileinfo.category = $("#category").val()
  fileinfo.pricing = $('#tier').val()
  fileinfo.meta = $("#meta").val()
//  console.log(fileinfo)
  if(!fileinfo.crop || !fileinfo.meta)
  {
    alert("You must complete all fields!")
  }else
  {
    ipcRenderer.send('__itemPush',fileinfo)
  }
  
})
$('#back').on('click',function(e){
  e.preventDefault()
  ipcRenderer.send('__gotoSelection','234')
})
function setInfo(data)
{
  fileinfo = data
  if(!fileinfo.crop)
  {
    fileinfo.crop = {
      x       :0,
      y       :0,
      width   :1,
      height  :1
    }
  }
  //console.log(data)
  $('#title').val(data.name.slice(0,data.name.lastIndexOf(".")))
  //alert(data.ctime)
  var date = new Date(data.ctime);
  var month = (date.getMonth() + 1);               
  var day = date.getDate();
  if (month < 10) 
      month = "0" + month;
  if (day < 10) 
      day = "0" + day;
  $('#date').val(date.getFullYear() + '-' + month + '-' + day)
  //$('#date').val("2020-09-12")
}
function showList(data){
  globalinfo = data

  $('#category').empty() 
  for(var i = 0 ;i < data.category.length;i++)
  {
//    console.log(data.category[i])
    $('#category').append('<option value="' + data.category[i] + '">' + data.category[i] + '</option>')
  }
  $('#tier').empty() 
  for(var i = 0 ;i < data.pricing.length;i++)
  {
//    console.log(data.pricing[i])
    $('#tier').append('<option value="' + data.pricing[i] + '">' + data.pricing[i] + '</option>')
  }
  $('#meta').empty() 

  for(var i = 0 ;i < data.meta.length;i++)
  {
    $('#meta').append('<option class="list-group-item" value="' + data.meta[i] + '">' + data.meta[i] + '</option>')
  }
}

ipcRenderer.on('tileshot',function(event,item){
  $('#tileimg').empty()
  //$('#tileimg').append('<img style="width:100%;" src="../temp/' + fileinfo.name + '/tile' + fileinfo.name + '.jpg"></img>')
  $('#tileimg').append(`<img style="width:100%;" src="${tempdirectory}/${fileinfo.name}/tile${fileinfo.name}.jpg"></img>`)

})
function getThumbnails()
{
  ipcRenderer.send('__getTile',{
    'vname' :fileinfo.name
  })  
}
$('#play').on('click',function(e){
  ipcRenderer.send('__play',{
    'name' :fileinfo.name
  })  
})
ipcRenderer.on('processing',function(event,item){
  $('#processcnt').empty()
  $('#processcnt').append(item.jobs.length)
})
ipcRenderer.on('uploadCnt',function(event,item){
  $('#uploadcnt').empty()
  $('#uploadcnt').append(item.cnt)
})
$(document).ready(function(){
    //alert('234')
    
    let param = JSON.parse(query['?data'])
    rawdirectory = param.rawdirectory
    tempdirectory = param.tempdirectory
    setInfo(param.info)
    showList(param.cinfo)
    
    getThumbnails()
  //  console.log(selData)

});