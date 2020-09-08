const {app, BrowserWindow,Menu,ipcMain,Tray,shell} = require('electron')

const path = require('path')
const fs = require('fs')
const utils = require('./utils.js')
let config = require('./config.js')
const { dialog } = require('electron')
const { title } = require('process')
const child = require('child_process').execFileSync
const spawnProc = require('child_process').spawn
const execProc = require('child_process').execFile

const rootPath = require('electron-root-path').rootPath

/**sftp */

var conSettings = {
  host      :config.sftp.host,
  port      :config.sftp.port,
  username  :config.sftp.username,
  password  :config.sftp.password
}
let Client = require('ssh2-sftp-client');
let conn = new Client();
let conClient=0
/**--sftp */

const mpegPath        = rootPath + config.mpegpath
const probePath       = rootPath + config.probpath
let rawdirectory      = rootPath + config.rawpath
let tempdirectory     = rootPath + config.temppath
let pendingdirectory  = rootPath + config.pendingpath
let uploaddirectory   = rootPath + config.uploadpath
let metapath          = rootPath + config.metapath
let icon              = rootPath + config.icon
let watermarkpng      = rootPath + config.watermark.path

let mainWindow = 0
let cropWindow = 0
let tray = null
//loop
let activeProcessingJob = false;
let processingJobList = []
let activeUploadJob = false;
//loop-end

let uploadcnt = 0
//wizard config
let wizardList
//wizard config---end
function createWindow () {

   mainWindow = new BrowserWindow({
    width: 1422,
    height: 800,
    icon:icon,
    title:'UploadTool',
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      devTools: true,
      nodeIntegration: true
    }
  })
  const mainMenu = Menu.buildFromTemplate(mainMenuTemplate)

 //Menu.setApplicationMenu(mainMenu)
 Menu.setApplicationMenu(null)

 mainWindow.on('minimize',function(event){
    event.preventDefault();
    mainWindow.hide();
  });
  const trayMenu = Menu.buildFromTemplate(trayMenuTemplate)
  
  tray = new Tray(icon)
  //tray.setToolTip('This is my application.')
  setTtrayMsg()
  tray.setContextMenu(trayMenu)
  tray.on('click',function(e){
    mainWindow.show()
    mainWindow.maximize()
  })
  

  if(config.sftp.enable == true)
  {
    conClient = conn.connect(conSettings)
  }
 gotoSelectionPage()
 getWizardCategoryList()
}
app.whenReady().then(() => {
  createWindow()
  
  app.on('activate', function () {
    if (BrowserWindow.getAllWindows().length === 0) createWindow()

  })
})
app.on('window-all-closed', function () {
  if (process.platform !== 'darwin') app.quit()
})
app.on('before-quit', function (evt) {
  conClient.then(()=>{
    return conn.end()
  })
  tray.destroy();
});
app.on('uncaughtException', function (error) {
  // Handle the error
  dialog.showMessageBox(error);
})
process.on("uncaughtException", (err) => {
  /*
  const messageBoxOptions = {
       type: "error",
       title: "Error in Main process",
       message: err
   };
   dialog.showMessageBox(messageBoxOptions);
   throw err;
   */
});
const mainMenuTemplate = [
  {
    label:'dev',
    submenu:[
      {
        label:'Toggle DevTools',
        accelerator:process.platform == 'darwin' ? 'Command+I':'Ctrl+I',
        click(item,focusedWindow){
          focusedWindow.toggleDevTools()
        }
      },
      {
        role:'reload'
      }
    ]
  }
]

const trayMenuTemplate = [
  {
    label:'close',
    click(item,w){
      console.log('close')
      app.quit()
    }
    
  }
]
function gotoSelectionPage()
{
  let info={
    'rawdirectory':rawdirectory
  }
  mainWindow.loadFile('./selection/selection.html',{query: {"data": JSON.stringify(info)}})
}

/*Signal */
ipcMain.on('__itemSelected',function(e,item){
 if (!fs.existsSync(tempdirectory + '/' + item.name))
    fs.mkdirSync(tempdirectory + '/' + item.name)
  gotoWizardPage(item)
})

function gotoWizardPage(item){

  let info = {
    'info'          :item,
    'cinfo'         :wizardList,
    'rawdirectory'  :rawdirectory,
    'tempdirectory' :tempdirectory
  }

  mainWindow.loadFile("./wizard/wizard.html", {query: {"data": JSON.stringify(info)}})
}
function getWizardCategoryList()
{
  var winfo = (fs.readFileSync(metapath).toString('utf8'))
  wizardList = JSON.parse(winfo)
}

function getThumb(vsrc,target,callback)
{
  execProc(probePath,[
      '-v','error',
      '-select_streams','v:0',
      '-show_entries','stream=nb_frames',
      '-of','default=nokey=1:noprint_wrappers=1',
      `${vsrc}`
  ],function(e,da){

      let framecnt = parseInt(da)//7191
      let complexpar = `select='eq(n,6)+not(mod(max(n,6),round((${framecnt}-1)/8)))+eq(n,(${framecnt}-1))',zscale=w=${config["new-width"] / 3}:h=${config["new-width"] / 3}:f=spline36,tile=layout=3x3`
      try{
          childprocess = spawnProc(mpegPath,[
              '-y',
              '-i' , `${vsrc}`,
              '-filter_complex',complexpar,
              '-vframes','1',
              '-q:v','1',
              '-qmin','1',
              '-qmax','1',
                target
          ])
          childprocess.stderr.on('data', (data) => {
              console.error(`stderr: ${data}`);
          });
          childprocess.on('close', (code) => {
              console.log(`child process exited with code ${code}`)
              callback()
          });
        
      }catch(err){
        console.log(err)
      }
  })
}
ipcMain.on('__getTile',function(event,item){

  let vsrc = `${rawdirectory + '/' + item.vname}`
  let target = `${tempdirectory}/${item.vname}` + '/tile' +  `${item.vname}` + '.jpg'
  getThumb(vsrc,target,function(){
    mainWindow.webContents.send('tileshot')
  })
})
ipcMain.on('__thumbCreated',function(e,item){
  mainWindow.webContents.send('thumbCreated')
  //pushToQueue(item)
})
ipcMain.on('__itemPush',function(e,item){
  console.log(item)
  pushToQueue(item)
  gotoSelectionPage()
  
})
ipcMain.on('__reload',function(event,item){

  getWizardCategoryList()
  mainWindow.webContents.send('listReset',{'cinfo':wizardList})

})
ipcMain.on('__itemCrop',function(e,item){
  console.log('crop')
  gotoCropPage(item)
})
ipcMain.on('__gotoSelection',function(e,item){
  console.log('gotoselection')
  gotoSelectionPage()
})
ipcMain.on('__play',function(event,item){
  shell.openExternal(`${rawdirectory}/${item.name}`)
  //spawnProc(`${rawdirectory}/${item.name}`,[])
})
function gotoCropPage(item){

  cropWindow = new BrowserWindow({
    width: 1080,
    height: 800,
    resizable:false,
    icon:config.icon,
    title:'Crop',
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      nodeIntegration: true
    }
  })
  let info={
    'item':item,
    'tempdirectory':tempdirectory
  }
  //console.log(item)
  cropWindow.loadFile("./crop/crop.html",{query: {"data": JSON.stringify(info)}})
  //console.log('finish')
}
ipcMain.on('__newScreen',function(event,item){

  execProc(probePath,[
    '-v','error',
    '-select_streams','v:0',
    '-show_entries','stream=duration',
    '-of','default=nokey=1:noprint_wrappers=1',
    `${rawdirectory + '/' + item.vname}`
],function(e,da){
 
    console.log(da)
    let t = parseInt(da) / 2 * item.step

    if(item.step==2)
      t -= 3
    if(item.step==0)
      t += 3
    console.log(t)
    let h = Math.floor(t / 3600)
    t -=  h * 3600
    let m = Math.floor(t / 60)
    t -=  m * 60
    let s = t

    if (h < 10) 
        h = "0" + h;
    if (m < 10) 
        m = "0" + m;
    if (s < 10) 
        s = "0" + s;  

  
    console.log(`${h}:${m}:${s}`)

    let spawnProcess = spawnProc(mpegPath,[
          '-ss',`${h}:${m}:${s}`,
          '-y',
          '-i' ,`${rawdirectory}` + '/' + `${item.vname}`,
          //'-c:v','libx264',
          '-frames:v','1',
          `${tempdirectory}/${item.vname}` + '/crop' +  `${item.vname + item.step}` + '.jpg'
      ])
      spawnProcess.stderr.on('data', (data) => {
        console.error(`stderr: ${data}`);
      });

      spawnProcess.on('close', (code) => {
        cropWindow.webContents.send('screenshot')
      });

  })
})
ipcMain.on('__cropped',function(e,item){
  mainWindow.webContents.send('cropped',item)
  cropWindow.close()
})

ipcMain.on('__cropcancel',function(e,item){
  cropWindow.close()
})
function getScreenShot(vsrc,imgpath,callback)
{
  let spawnProcess = spawnProc(mpegPath,[
      '-ss',`00:00:01`,
      '-y',
      '-i' ,`${vsrc}`,
      //'-c:v','libx264',
      '-frames:v','1',
      `${imgpath}`
  ])
  spawnProcess.stderr.on('data', (data) => {
    console.error(`stderr: ${data}`);
  });
  spawnProcess.on('close', (code) => {

    callback()
  });

}

function getGif(vsrc,gifpath,callback)
{
  execProc(probePath,[
    '-v','error',
    '-select_streams','v:0',
    '-show_entries','stream=duration',
    '-of','default=nokey=1:noprint_wrappers=1',
    `${vsrc}`
    ],function(e,da){
    console.log(da)
    let t = parseInt(da)

    let betweenline=''
    for(var i = 0;i <= 50;i++)
    {
      if(i != 50)
        betweenline += `between'(t\, ${i}*ceil(${t})/${config.gif.secnt}\, ${i}*ceil(${t})/${config.gif.secnt}+${config.gif.selen})'+`
      else
        betweenline += `between'(t\, ${i}*ceil(${t})/${config.gif.secnt}\, ${i}*ceil(${t})/${config.gif.secnt}+${config.gif.selen})'`
    }

//    let complexpar = `select='eq(n,6)+not(mod(max(n,6),round((${v}-1)/8)))+eq(n,(${v}-1))',zscale=w=320:h=-2:f=spline36,tile=layout=3x3`
    let complexpar = `[0:v]select=${betweenline},setpts=N/FRAME_RATE/TB,zscale=w=${config["new-width"]}:h=${config["new-width"]}:filter=spline36,setsar=1/1,fps=fps=15,split[a][b];[a]palettegen=max_colors=256[p];[b][p]paletteuse=dither=bayer`

    //let complexpar = `[0:v]select=${betweenline},setpts=N/FRAME_RATE/TB,zscale=w=ceil(iw*0.4/2)*2:h=ceil(ow/dar/2)*2:filter=spline36,setsar=1/1,fps=fps=15,split[a][b];[a]palettegen=max_colors=256[p];[b][p]paletteuse=dither=bayer`
    console.log("-----------")
    console.log(complexpar)
    try{
        childProcess = spawnProc(mpegPath,[
            '-y',
            '-i' , `${vsrc}`,
            '-filter_complex',complexpar,
            '-an', gifpath
        ])
        childProcess.stderr.on('data', (data) => {
            console.error(`stderr: ${data}`);
        });
        childProcess.stdout.on('data', (data) => {
            console.error(`stdout: ${data}`);
        });
    
        childProcess.on('close', (code) => {
            console.log(`child process exited with code ${code}`)
            callback()
        });

    }catch(err){
      console.log(err)
        console.log('BIGERR')
    }
    
  })
}
//The button handler for the button of same name in Wizard.png
function pushToQueue(data)
{
  console.log(data)
  processingJobList.push(data)
}

//Process Loop:
async function getDateFoldeName(uploadTitleDir,date){
  if (!fs.existsSync(uploadTitleDir)){
    return date
  }
  let existdirs = fs.readdirSync(uploadTitleDir)
  console.log(existdirs)
  let cnt = 0
  for(var i = 0;i < existdirs.length;i++)
  {
    if(existdirs[i].indexOf(date) != -1){
      cnt++
    }
  }
  if(cnt == 0)
  {
    return date
  }else
  {
    return `${date}-${cnt}`
  }
}
setInterval(async function(){
  let items = await fs.readdirSync(rawdirectory)
  let videofullname = items.filter(item=>utils.getFileExtension(item) == 'mp4' || utils.getFileExtension(item) == 'avi')
  let videolist = (videofullname).map(item=>item.slice(0,item.lastIndexOf(".")))
  let thumblist = (items.filter(item=>utils.getFileExtension(item) == 'jpg')).map(item=>item.slice(0,item.lastIndexOf(".")))

  let changed = false
  for(var i = 0;i < videolist.length;i++)
  {
    if(thumblist.indexOf(videolist[i]) == -1)
    {
      changed = true
      await child(mpegPath,[
          '-ss','00:00:03',
          '-y',
          '-i' ,`${rawdirectory}` + '/' +  `${videofullname[i]}`,
          '-frames:v','1',
          `${rawdirectory}` + '/' +  `${videolist[i]}` + '.jpg'
      ])
    }
  }
//  console.log(changed)
  if(changed)
  {
    mainWindow.webContents.send('rawVideoChanged',"Ok")
  }
},2000)

setInterval(async function(){
  
  mainWindow.webContents.send('processing',{'jobs':processingJobList})
  setTtrayMsg()

	if (activeProcessingJob == false && processingJobList.length >= 1)
	{	
		activeProcessingJob = true;
    let itemName = processingJobList[0].name
    let sourcePath = rawdirectory + '/' + itemName

   let uploadCatDir = uploaddirectory + '/' + processingJobList[0].category
   let uploadTitleDir = uploadCatDir + '/' + processingJobList[0].newname
   mainWindow.webContents.send('error',{'err':"BeforeProcess"})

   let uploadDateDir = await getDateFoldeName(uploadTitleDir,processingJobList[0].date)
   mainWindow.webContents.send('error',{'err':uploadDateDir})

   let uploadPrefix = uploadTitleDir + '/' +
                      uploadDateDir + '/' +
                      processingJobList[0].category + '_' + processingJobList[0].newname + '_' + uploadDateDir

   let pendingPrefix = pendingdirectory + '/' +
                       processingJobList[0].category + '_' + 
                       processingJobList[0].newname + '_' +
                       uploadDateDir
    pendingTargetPath = pendingPrefix + '.mp4'

    const filtercomplex = `[0]crop=iw*${processingJobList[0].crop.width}:ih*${processingJobList[0].crop.height}:iw*${processingJobList[0].crop.x}:ih*${processingJobList[0].crop.y}[t0];[1][t0]scale2ref=w=iw*${config.watermark.width}:h=ow/mdar[t1p][t0p];[t0p][t1p]overlay=ceil((W-w)/2)*2:ceil((H-h)/2)*2,setsar=1/1`
    mainWindow.webContents.send('error',{'err':filtercomplex})

    execProc(mpegPath,[
      '-y',
      '-i', `${sourcePath}`,    // source path
      '-i', `${watermarkpng}`,
      '-filter_complex',filtercomplex,
      '-c:v' , 'libx264',
      '-preset' ,'veryslow',
      '-crf','20',
      '-c:a','aac',
//    '-b:a','160k',
      '-pix_fmt' , 'yuv420p',
      `${pendingTargetPath}`
    ],function(err,data){
      if(err)
      {
        mainWindow.webContents.send('error',{'err':err})

    		activeProcessingJob = false;
      }else{

        getThumb(pendingTargetPath,pendingPrefix + '.jpg',function(){
          getGif(pendingTargetPath,pendingPrefix + '.gif',function(){
            getScreenShot(pendingTargetPath,`${pendingPrefix}_shot.jpg`,function(){
            console.log('success')

            let saveVal = {
              "Category"    :processingJobList[0].category,
              "pricingTier" :processingJobList[0].pricing,
              "Meta"        :processingJobList[0].meta
            }
            fs.writeFileSync(pendingPrefix + '.txt', JSON.stringify(saveVal), 'utf-8');
            
            //-----------upload
            if (!fs.existsSync(uploadCatDir))
                  fs.mkdirSync(uploadCatDir)
            if (!fs.existsSync(uploadTitleDir))
                  fs.mkdirSync(uploadTitleDir)
            if (!fs.existsSync(`${uploadTitleDir}/${uploadDateDir}`))
                  fs.mkdirSync(`${uploadTitleDir}/${uploadDateDir}`)
            
            
            fs.renameSync(`${sourcePath}`,`${uploadPrefix}.mp4`)
            fs.copyFileSync(pendingPrefix + '.txt',`${uploadPrefix}.txt`)
            //--------remove temp
            fs.rmdirSync(`${tempdirectory}/${itemName}`, { recursive: true })
            fs.unlinkSync(`${rawdirectory}/${itemName.slice(0,itemName.lastIndexOf('.'))}.jpg`)
            //---------!------
            processingJobList.splice(0,1)
            activeProcessingJob = false;

            mainWindow.webContents.send('rawVideoChanged',"Ok")
            })
          })
          
        })
        
      }
    })
    		
	}

}, 500);

//Upload Loop:
setInterval(function(){
	var remotePathToList = config.sftp.remotepath
	if (activeUploadJob == false && config.uploadEnable)
	{
    //Check each file in "Pending Upload Queue"
    let pendingItems = fs.readdirSync(pendingdirectory)
    let txtItems = pendingItems.filter(item=>utils.getFileExtension(item) == 'txt')

    pendingItems = pendingItems.filter(item=>utils.getFileExtension(item) == 'mp4')
    

    txtItems = txtItems.map(item=>item.slice(0,item.lastIndexOf('.')))
    mainWindow.webContents.send('uploadCnt',{'cnt':txtItems.length})
    uploadcnt = txtItems.length
    setTtrayMsg()
    if(pendingItems.length >= 1)
    {
      
      let element = pendingItems[0]
      let name = element.slice(0,element.lastIndexOf('.'))
      if(txtItems.indexOf(name) != -1)
      {
        console.log('ok')
        activeUploadJob = true;
        let remoteDir = name.split("_")
        let tpath = `${remotePathToList}${remoteDir[0]}/${remoteDir[1]}/p-${remoteDir[2]}`
        let newpath = `${remotePathToList}${remoteDir[0]}/${remoteDir[1]}/${remoteDir[2]}`
        conClient
        .then(()=>{
          return conn.mkdir(tpath, true);
        })
        .then(()=>{
          //client.put('/home/fred/test.txt', '/remote/dir/test.txt');
          return conn.put(`${pendingdirectory}/${element}`,`${tpath}/${element}`)
        })
        .then(()=>{
          return conn.put(`${pendingdirectory}/${name}.jpg`,`${tpath}/${name}.jpg`)
        })
        .then(()=>{
          return conn.put(`${pendingdirectory}/${name}.gif`,`${tpath}/${name}.gif`)
        })
        .then(()=>{
          return conn.put(`${pendingdirectory}/${name}_shot.jpg`,`${tpath}/${name}_shot.jpg`)
        })
        .then(()=>{
          return conn.put(`${pendingdirectory}/${name}.txt`,`${tpath}/${name}.txt`)
        })
        .then(()=>{
          return conn.rename(tpath,newpath)
        })
        .then(()=>{
            
            fs.unlink(`${pendingdirectory}/${element}`, function(err){
              if(err) throw err
              fs.unlink(`${pendingdirectory}/${name}.txt`,function(er){
                if(er) throw er
                fs.unlink(`${pendingdirectory}/${name}.jpg`,function(jer){
                  if(jer) throw jer
                  fs.unlink(`${pendingdirectory}/${name}.gif`,function(ger){
                    if(ger) throw ger
                    fs.unlink(`${pendingdirectory}/${name}_shot.jpg`,function(ser){
                      if(ser) throw ser
                      activeUploadJob = false
                      console.log('success')
                    })
                  })
                })
                
              })
            })
        })
        .catch(err=>{
          console.log(err)
        })
      }
      
    }
	}

}, 500);
function setTtrayMsg()
{
    tray.setToolTip(`Num in progress:${processingJobList.length},Num in Upload:${uploadcnt}`)
}
