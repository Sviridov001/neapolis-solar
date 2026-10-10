const {app,BrowserWindow,Menu,dialog,session} = require('electron');
const path=require('node:path');const {startServer}=require('./server.cjs');
let server,win,base;
const lock=app.requestSingleInstanceLock();
if(!lock)app.quit();
else {
 app.on('second-instance',()=>{if(win){if(win.isMinimized())win.restore();win.focus();}});
 app.whenReady().then(async()=>{
  const local=await startServer(path.join(app.getAppPath(),'dist'));server=local.server;base=local.base;
  session.defaultSession.setPermissionRequestHandler((_wc,_p,cb)=>cb(false));
  session.defaultSession.webRequest.onBeforeRequest((details,cb)=>cb({cancel:!details.url.startsWith(base)&&!details.url.startsWith('blob:')&&details.url!=='about:blank'}));
  win=new BrowserWindow({width:1500,height:980,minWidth:900,minHeight:640,title:'Неаполис — Солнечный анализ',backgroundColor:'#101820',show:false,webPreferences:{nodeIntegration:false,contextIsolation:true,sandbox:true,webSecurity:true}});
  win.webContents.setWindowOpenHandler(()=>({action:'deny'}));
  win.webContents.on('will-navigate',(e,url)=>{if(!url.startsWith(base))e.preventDefault()});
  win.once('ready-to-show',()=>win.show());
  win.webContents.session.on('will-download',(_event,item)=>{
   item.setSaveDialogOptions({defaultPath:path.join(app.getPath('downloads'),item.getFilename())});
  });
  const menu=Menu.buildFromTemplate([
   {label:'Файл',submenu:[{label:'Импорт IFC…',accelerator:'Ctrl+O',click:()=>win.webContents.executeJavaScript("document.getElementById('file').click()",true)},{type:'separator'},{label:'Выход',role:'quit'}]},
   {label:'Вид',submenu:[{label:'Перезагрузить',role:'reload'},{type:'separator'},{label:'Увеличить интерфейс',role:'zoomIn'},{label:'Уменьшить интерфейс',role:'zoomOut'},{label:'Исходный размер',role:'resetZoom'},{label:'Полный экран',role:'togglefullscreen'}]},
   {label:'Помощь',submenu:[{label:'Как пользоваться',click:()=>win.webContents.executeJavaScript("document.getElementById('helpDialog').showModal()")},{label:'О программе',click:()=>dialog.showMessageBox(win,{type:'info',title:'Неаполис — Солнечный анализ',message:`Версия ${app.getVersion()}`,detail:'Предварительный геометрический анализ прямого солнца. IFC и расчёт обрабатываются на вашем компьютере. Без нормативной оценки помещений.'})}]}
  ]);Menu.setApplicationMenu(menu);
  await win.loadURL(local.url);
 }).catch(err=>{dialog.showErrorBox('Не удалось открыть приложение',err.message);app.quit()});
 app.on('window-all-closed',()=>app.quit());
 app.on('before-quit',()=>server?.close());
}
