module.exports = {
    'mpegpath'      :'/assets/ffmpeg.exe',
    'probpath'      :'/assets/ffprobe.exe',
    'rawpath'       :'/assets/rawdirectory',
    'pendingpath'   :'/assets/pending',
    'temppath'      :'/assets/temp',
    'uploadpath'    :'/assets/upload',
    'metapath'      :'/assets/meta.txt',
    'icon'          :'./assets/icon.png',
    'updateinterval':5000,
    'watermark'     :{
        'path'  :'/assets/watermark.png',
        'width' :0.2,
        'pos'   :0.8
    },
    'new-width'     :260,
    'gif'           :{
        'secnt' :5,
        'selen' :3
    },
    'uploadEnable'  :false,
    'sftp':{
        'enable'    :true,
        'remotepath':'/home/serveradmin/Test/PUBLIC/LIBRARY/',
        'host'      :'172.104.253.205',
        'port'      :22, // Normal is 22 port
        'username'  :'serveradmin',
        'password'  :'DFQ)9w87e#rjqw$r%3$qtw#qe$t'
    }
}
