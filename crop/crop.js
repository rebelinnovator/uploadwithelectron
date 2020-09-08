const electron = require('electron')
const {ipcRenderer} = electron
const querystring = require('querystring');

let query = querystring.parse(global.location.search);
let tempdirectory=''
let step = 0 //0: first 1:middle 2:last
let info

let jcrop_api
let cropX1
let cropY1
let cropX2
let cropY2
let cropW
let cropH

$('#beginbtn').on('click',function(e){
    //cropX += speed
    e.preventDefault()
    step = 0;
    setScreen()
})
$('#middlebtn').on('click',function(e){
    //cropX += speed
    e.preventDefault()

    step = 1;
    setScreen()
})
$('#endbtn').on('click',function(e){
    //cropX += speed
    e.preventDefault()

    step = 2;
    setScreen()
})

$('#okbtn').on('click',function(e){

    let divw = $("#screen").width()
    let divh = $("#screen").height()

    ipcRenderer.send('__cropped',{
        'x':cropX1 / divw,
        'y':cropY1 / divh,
        'width':cropW / divw,
        'height':cropH / divh
    })
})
$('#cancelbtn').on('click',function(e){

    ipcRenderer.send('__cropcancel')
})
function setScreen(){
    ipcRenderer.send('__newScreen',{
        'vname' :info.name,
        'step'  :step
    })
}
ipcRenderer.on('screenshot',function(event,item){
    $('#screen').empty()
//    $('#screen').append('<img class="screen" src="../temp/' + info.name + '/crop' + info.name + step + '.jpg"></img>')
    $('#screen').append(`<img class="screen" src="${tempdirectory}/${info.name}/crop${info.name}${step}.jpg"></img>`)
    $('.screen').Jcrop({
        onChange:   cropChange,
    },function(){
        jcrop_api = this
        jcrop_api.setSelect([cropX1,cropY1,cropX2,cropY2])
    })
})
function cropChange(c){
    cropX1 = c.x
    cropY1 = c.y
    cropX2 = c.x2
    cropY2 = c.y2
    cropW = c.w
    cropH = c.h
//    console.log(`${cropX1}:${cropY1}==${cropX2}:${cropY2}`)
//   console.log(`${cropW}:${cropH}`)

}
$(document).ready(function(){
    //alert('234')
    let param = JSON.parse(query['?data'])

    info = param.item
//   console.log(info)
    if(info.crop){
        let divw = $("#screen").width()
        let divh = $("#screen").height()
        cropX1 = info.crop.x * divw
        cropY1 = info.crop.y * divh
        cropW = info.crop.width * divw
        cropH = info.crop.height * divh
        cropX2 = cropX1 + cropW
        cropY2 = cropY1 + cropH
    }else
    {
        let divw = $("#screen").width()
        let divh = $("#screen").height()
        cropX1 = 0
        cropY1 = 0
        cropW = divw
        cropH = divh
        cropX2 = cropX1 + cropW
        cropY2 = cropY1 + cropH
    }
    tempdirectory = param.tempdirectory
    step = 0;
    setScreen()
});