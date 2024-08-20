import { app, BrowserWindow, shell, ipcMain, dialog } from "electron";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";
import path from "node:path";
import os from "node:os";
import fs from "node:fs";
import * as fsExtra from "fs-extra";
import { update } from "./update";
import {
  extractZipFile,
  convertIconToBase64,
  killProcessTree,
  thorwError,
} from "../utils/utils";
import * as child_process from "child_process";
import axios from "axios";
import { message } from "antd";
import { KP_APP_CONFIG } from "electron/types/app";
import {
  initDatabase,
  querySQData,
  deleteSQData,
  addSQData,
  modifySQData,
} from "../db/createDB";

const require = createRequire(import.meta.url);
const __dirname = path.dirname(fileURLToPath(import.meta.url));

// The built directory structure
//
// ├─┬ dist-electron
// │ ├─┬ main
// │ │ └── index.js    > Electron-Main
// │ └─┬ preload
// │   └── index.mjs   > Preload-Scripts
// ├─┬ dist
// │ └── index.html    > Electron-Renderer
//
process.env.APP_ROOT = path.join(__dirname, "../..");

export const MAIN_DIST = path.join(process.env.APP_ROOT, "dist-electron");
export const RENDERER_DIST = path.join(process.env.APP_ROOT, "dist");
export const VITE_DEV_SERVER_URL = process.env.VITE_DEV_SERVER_URL;

process.env.VITE_PUBLIC = VITE_DEV_SERVER_URL
  ? path.join(process.env.APP_ROOT, "public")
  : RENDERER_DIST;

// Disable GPU Acceleration for Windows 7
if (os.release().startsWith("6.1")) app.disableHardwareAcceleration();

// Set application name for Windows 10+ notifications
if (process.platform === "win32") app.setAppUserModelId(app.getName());

if (!app.requestSingleInstanceLock()) {
  app.quit();
  process.exit(0);
}

let win: BrowserWindow | null = null;
const preload = path.join(__dirname, "../preload/index.mjs");
const indexHtml = path.join(RENDERER_DIST, "index.html");

const mainWindow: Map<String, BrowserWindow> = new Map();
const mainProcess: Map<String, child_process.ChildProcess> = new Map();
const coreApp: Map<String, child_process.ChildProcess> = new Map();

const getLocalConfig = async (type: "kp_app" | "kp_core_app") => {
  const res = await querySQData(type, {});
  return res.data && res.data.length > 0 ? res.data : [];
};
const startCoreApp = async () => {
  try {
    const res = await getLocalConfig("kp_core_app");
    const data = res[0];
    const { local_path, start_type, name } = data;
    if (!fs.existsSync(local_path)) {
      dialog.showErrorBox("错误", "系统文件缺失，请运行修复工具");
      return;
    }

    if (start_type === "exe") {
      startProcess(name, local_path);
    } else {
      //暂不处理
    }
  } catch (err) {}
};

const installApp = async (event: Electron.IpcMainEvent, appConfig: string) => {
  const config = JSON.parse(appConfig);

  const {
    name,
    desc,
    icon,
    appResource,
    startPath,
    startType,
    version,
    isUpdate,
    updateDesc,
    createDate,
  } = config;
  const userDataPath = app.getPath("userData");
  const app_id = `KP${+new Date()}`;
  const targetPath = path.join(userDataPath, "system", "app", app_id);

  //判断当前应用是否启动
  switch (startType) {
    case "exe":
      if (coreApp.has(name)) {
        event.reply(
          "install-app-reply",
          JSON.stringify({
            name,
            status: "fail",
            message: "请先关闭应用再进行更新",
          })
        );
        return;
      }
      break;
    case "webview":
      if (mainWindow.has(name)) {
        event.reply(
          "install-app-reply",
          JSON.stringify({
            name,
            status: "fail",
            message: "请先关闭应用再进行更新",
          })
        );
        return;
      }
      break;
    default:
      break;
  }

  if (!fs.existsSync(targetPath)) {
    fsExtra.ensureDirSync(targetPath);
  }

  event.reply(
    "install-app-reply",
    JSON.stringify({
      name,
      status: "pending",
      message: "下载资源...",
    })
  );

  try {
    const appResourceFile = await axios.get(appResource, {
      responseType: "arraybuffer",
    });

    await fs.promises.writeFile(
      path.join(targetPath, "resources.zip"),
      Buffer.from(appResourceFile.data)
    );

    event.reply(
      "install-app-reply",
      JSON.stringify({
        name,
        status: "pending",
        message: "解压资源...",
      })
    );

    await extractZipFile(path.join(targetPath, "resources.zip"), targetPath);

    await fs.promises.unlink(path.join(targetPath, "resources.zip"));

    event.reply(
      "install-app-reply",
      JSON.stringify({
        name,
        status: "pending",
        message: "安装中...",
      })
    );

    await handleExtractedFiles(targetPath);

    if (!fs.existsSync(path.join(targetPath, "resources", startPath))) {
      event.reply(
        "install-app-reply",
        JSON.stringify({
          name,
          status: "fail",
          message: "解析安装包失败，请稍后再试",
        })
      );

      return;
    }

    const iconBase64 = await convertIconToBase64(icon);

    let create_at = createDate;

    if (!isUpdate) {
      create_at = +new Date();
    }

    const update_at = +new Date();

    const configData = {
      name,
      app_id,
      desc,
      icon: iconBase64,
      app_resource: appResource,
      version,
      start_path: startPath,
      start_type: startType,
      update_at,
      create_at,
      update_desc: updateDesc,
      local_path: path.join(targetPath, "resources", startPath),
    };

    const getRes = await querySQData("kp_app", { name });
    if (getRes.code !== 101) {
      event.reply(
        "install-app-reply",
        JSON.stringify({
          name,
          status: "fail",
          message: "系统错误，请稍后再试",
        })
      );
      return;
    }

    if (getRes.data && getRes.data.length > 0) {
      const res = await modifySQData("kp_app", { name }, configData);
      if (res.code !== 101) {
        event.reply(
          "install-app-reply",
          JSON.stringify({
            name,
            status: "fail",
            message: "系统错误，请稍后再试",
          })
        );
        return;
      }
    } else {
      //写入数据库
      const res = await addSQData("kp_app", configData);
      if (res.code !== 101) {
        event.reply(
          "install-app-reply",
          JSON.stringify({
            name,
            status: "fail",
            message: "系统错误，请稍后再试",
          })
        );
        return;
      }
    }

    // console.log("res", res);

    event.reply(
      "install-app-reply",
      JSON.stringify({
        name,
        status: "success",
        message: `${name}安装成功`,
      })
    );
  } catch (err) {
    console.log("Err", err);
    if (fs.existsSync(targetPath)) {
      fsExtra.remove(targetPath);
    }
    event.reply(
      "install-app-reply",
      JSON.stringify({
        name,
        status: "fail",
        message: "网络环境不佳，请稍后再试",
      })
    );
  }
};

const startProcess = (name: string, startPath: string) => {
  try {
    const process = child_process.spawn(startPath, { shell: false });
    coreApp.set(name, process);

    if (process) {
      console.log("processStart", process.pid);
      process.on("exit", (code, signal) => {
        // 自动重启
        if (win !== null) {
          console.log(`Restarting process ${name}...`);
          startProcess(name, startPath);
        }
      });
    }
  } catch (err) {
    if (coreApp.has(name)) {
      coreApp.delete(name);
    }
    //重启
    startProcess(name, startPath);
  }
};

const startApp = async (event: Electron.IpcMainEvent, appConfig: any) => {
  const config = JSON.parse(appConfig);

  const { app_id } = config;
  const res = await querySQData("kp_app", { app_id });

  if (res.code !== 101 || !res.data || res.data.length < 1) {
    dialog.showErrorBox("错误", "插件不存在，请重新安装");
    event.reply(
      "start-app-reply",
      JSON.stringify({ id: app_id, status: "fail" })
    );
    return;
  }

  const { name, start_type, local_path } = res.data[0];
  console.log("start_path", local_path);
  if (!fs.existsSync(local_path)) {
    console.log("not found file");
    const res = await deleteSQData("kp_app", { app_id });
    dialog.showErrorBox("错误", `插件【${name}】文件损坏，请重新安装`);
    event.reply("uninstall-app", { name, status: "fail" });
    return;
  }

  // 根据 startType 打开不同类型的窗口
  if (start_type === "webview") {
    mainWindow.set(
      app_id,
      new BrowserWindow({
        webPreferences: {
          nodeIntegration: true,
          contextIsolation: false,
        },
      })
    );
    const window = mainWindow.get(app_id);
    if (window) {
      window.loadURL(`file://${local_path}`);
      event.reply(
        "start-app-reply",
        JSON.stringify({ id: app_id, status: "running" })
      );
    }

    mainWindow.get(app_id)?.on("closed", () => {
      mainWindow.delete(app_id);
      // 通知渲染进程主窗口已关闭
      // event.reply("main-process-status", { name: name, status: "closed" });
      event.reply(
        "start-app-reply",
        JSON.stringify({
          id: app_id,
          status: "closed",
        })
      );
    });
  } else if (start_type === "exe") {
    mainProcess.set(app_id, child_process.spawn(local_path, { shell: false }));
    const process = mainProcess.get(app_id);

    if (process) {
      process.on("exit", () => {
        const pid = process.pid;
        if (pid) {
          killProcessTree(pid);
        }

        mainProcess.delete(app_id);

        event.reply(
          "start-app-reply",
          JSON.stringify({ id: app_id, status: "closed" })
        );
      });
      event.reply(
        "start-app-reply",
        JSON.stringify({ id: app_id, status: "running" })
      );
    }
  }
};

//处理解压后的文件
const handleExtractedFiles = async (downloadPath: string) => {
  //将解压后的文件重命名为resources
  const files = await fs.promises.readdir(downloadPath);
  //如果是文件夹则重命名否则创建文件夹并移动文件
  if (files.length === 1) {
    const file = files[0];
    const fileStat = await fs.promises.stat(path.join(downloadPath, file));
    if (fileStat.isDirectory()) {
      await fs.promises.rename(
        path.join(downloadPath, file),
        path.join(downloadPath, "resources")
      );
    } else {
      await fs.promises.mkdir(path.join(downloadPath, "resources"));
      await fs.promises.rename(
        path.join(downloadPath, file),
        path.join(downloadPath, "resources", file)
      );
    }
  } else {
    //创建文件夹并移动文件
    await fs.promises.mkdir(path.join(downloadPath, "resources"));
    for (let i = 0; i < files.length; i++) {
      await fs.promises.rename(
        path.join(downloadPath, files[i]),
        path.join(downloadPath, "resources", files[i])
      );
    }
  }
};

//获取已安装app
const getLocalApp = async (event: Electron.IpcMainEvent, arg: any) => {
  const res = await getLocalConfig("kp_app");
  event.reply("get-app-list-reply", JSON.stringify(res));
};

const restartApp = () => {
  console.log("restartApp");
  app.relaunch();
  app.quit();
};

const checkCoreUpdate = async (event: Electron.IpcMainEvent, arg: any) => {
  const localConfig: any = await querySQData("kp_core_app", {});
  try {
    const updateUrl = "http://127.0.0.1:3001/core";
    //获取服务器配置
    const remoteConfig = await axios.get(updateUrl);
    if (remoteConfig.data.length < 1) {
      return;
    }
    const data = remoteConfig.data[0];

    if (data.version !== localConfig.data[0].version) {
      const app_id = `KP${+new Date()}`;
      const targetPath = path.join(
        app.getPath("userData"),
        "system",
        "app",
        app_id
      );
      if (!fs.existsSync(targetPath)) {
        fsExtra.ensureDirSync(targetPath);
      }

      const appResourceFile = await axios.get(data.appResource, {
        responseType: "arraybuffer",
      });

      await fs.promises.writeFile(
        path.join(targetPath, "resources.zip"),
        Buffer.from(appResourceFile.data)
      );

      await extractZipFile(path.join(targetPath, "resources.zip"), targetPath);

      await fs.promises.unlink(path.join(targetPath, "resources.zip"));

      await handleExtractedFiles(targetPath);

      if (!fs.existsSync(path.join(targetPath, "resources", data.startPath))) {
        return;
      }

      const iconBase64 = await convertIconToBase64(data.icon);

      const configData = {
        name: data.name,
        app_id,
        desc: data.desc,
        icon: iconBase64,
        app_resource: data.appResource,
        version: data.version,
        start_path: data.startPath,
        start_type: data.startType,
        update_at: +new Date(),
        create_at: data.createDate,
        update_desc: data.updateDesc,
        local_path: path.join(targetPath, "resources", data.startPath),
      };

      const res = await modifySQData("kp_core_app", {}, configData);

      if (res.code !== 101) {
        return;
      }

      event.reply(
        "check-core-update-reply",
        JSON.stringify({
          status: "success",
          message: "系统更新成功",
          version: data.version,
          updateDesc: data.updateDesc,
        })
      );
    }

    //版本校验不一致则更新
    // if (data.version !== localConfig.version) {
    //   const folderName = `KP${+new Date()}`;
    //   const downloadPath = path.join(
    //     userDataPath,
    //     "system",
    //     "coreApp",
    //     folderName
    //   );
    //   await fsExtra.ensureDir(downloadPath);
    //   const downloadPathFile = path.join(downloadPath, "resources.zip");
    //   const appResourceFile = await axios.get(data.appResource, {
    //     responseType: "arraybuffer",
    //   });
    //   await fs.promises.writeFile(
    //     downloadPathFile,
    //     Buffer.from(appResourceFile.data)
    //   );
    //   //解压
    //   await extractZipFile(downloadPathFile, downloadPath);
    //   //处理文件
    //   await handleExtractedFiles(downloadPath);
    //   //转换icon为base64
    //   const iconBase64 = await convertIconToBase64(data.icon);
    //   const configData = {
    //     ...config,
    //     name: data.name,
    //     desc: data.desc,
    //     icon: iconBase64,
    //     version: data.version,
    //     startPath: data.startPath,
    //     startType: data.startType,
    //     updateDate: +new Date(),
    //     createDate,
    //     localPath: folderName,
    //   };
    //   // 写入config
    //   await fs.promises.writeFile(
    //     path.join(downloadPath, "config.json"),
    //     JSON.stringify(configData),
    //     "utf-8"
    //   );
    //   //判断mainConfig.app里是否存在同名app
    //   const appList = JSON.parse(JSON.stringify(mainConfig.coreApp));
    //   const isExist = appList.some((item: any) => item.name === name);
    //   if (isExist) {
    //     //删除原有app
    //     const index = appList.findIndex((item: any) => item.name === name);
    //     appList.splice(index, 1);
    //   }
    //   appList.push(configData);
    //   const newMainConfig = {
    //     ...mainConfig,
    //     coreApp: appList,
    //   };
    //   //更新本地配置
    //   await fs.promises.writeFile(
    //     path.join(userDataPath, "system", "config.json"),
    //     JSON.stringify(newMainConfig),
    //     "utf-8"
    //   );
    //   event.reply("check-core-update-reply", JSON.stringify(data));
  } catch (err: any) {
    console.log(err);
    if (err.name && err.name === "KP_CORE_ERROR") {
      dialog.showErrorBox("错误", err.message);
    } else {
      dialog.showErrorBox("错误", "系统核心模块损坏，请运行修复工具");
    }
  }
  return;
};

const startDebug = async (event: Electron.IpcMainEvent) => {
  const res = await querySQData("kp_core_app", {});

  if (res.code !== 101 || !res.data || res.data.length < 1) {
    event.reply(
      "open-debug-reply",
      JSON.stringify({
        status: "fail",
        message: "系统缺少重要文件请卸载后重新安装",
      })
    );
    return;
  }
  const data = res.data[0];
  const { name, local_path, app_resource, start_path, create_at, icon } = data;
  const app_id = `KP${+new Date()}`;
  const targetPath = path.join(
    app.getPath("userData"),
    "system",
    "app",
    app_id
  );
  if (!fs.existsSync(targetPath)) {
    fsExtra.ensureDirSync(targetPath);
  }

  try {
    const appResourceFile = await axios.get(app_resource, {
      responseType: "arraybuffer",
    });

    await fs.promises.writeFile(
      path.join(targetPath, "resources.zip"),
      Buffer.from(appResourceFile.data)
    );

    await extractZipFile(path.join(targetPath, "resources.zip"), targetPath);

    await fs.promises.unlink(path.join(targetPath, "resources.zip"));

    await handleExtractedFiles(targetPath);

    if (!fs.existsSync(path.join(targetPath, "resources", start_path))) {
      event.reply(
        "open-debug-reply",
        JSON.stringify({
          status: "fail",
          message: "解析安装包失败，请稍后再试",
        })
      );
      return;
    }
    const configData = {
      name,
      app_id,
      desc: data.desc,
      icon,
      app_resource,
      version: data.version,
      start_path: data.start_path,
      start_type: data.start_type,
      update_at: +new Date(),
      create_at: create_at,
      update_desc: data.update_desc,
      local_path: path.join(targetPath, "resources", start_path),
    };
    const res = await modifySQData("kp_core_app", { name }, configData);
    if (res.code !== 101) {
      event.reply(
        "open-debug-reply",
        JSON.stringify({ status: "fail", message: "系统错误，请稍后再试" })
      );
      return;
    }
    event.reply("open-debug-reply", JSON.stringify({ status: "success" }));
  } catch (err) {
    console.log("Err", err);
    if (fs.existsSync(targetPath)) {
      fsExtra.remove(targetPath);
    }
    event.reply(
      "open-debug-reply",
      JSON.stringify({ status: "fail", message: "网络环境不佳，请稍后再试" })
    );
  }
};

const getSystemInfo = async (event: Electron.IpcMainEvent) => {
  const coreApp: any = (await querySQData("kp_core_app", {})).data;

  const cpu = os.cpus().length; //cpu核心数
  const memory = os.totalmem(); //内存
  const platform = os.platform(); //操作系统
  const arch = os.arch(); //系统架构
  const release = os.release(); //系统版本号
  const version = os.version(); //系统版本
  const userInfo = os.userInfo(); //用户信息
  const network = os.networkInterfaces(); //网络信息
  const softVersion = app.getVersion(); //软件版本
  const totalmem = os.totalmem(); //总内存
  const freemem = os.freemem(); //空闲内存
  // const systemConfig = await getAppConfig(); //系统配置
  const coreVersion = coreApp[0].version;
  //内核版本
  const coreLastUpdate = coreApp[0].updateDate; //内核最后更新时间

  const systemInfo = {
    cpu,
    memory,
    platform,
    arch,
    release,
    version,
    userInfo,
    network,
    softVersion,
    coreVersion,
    totalmem,
    freemem,
    coreLastUpdate,
  };

  event.reply("get-system-info-reply", JSON.stringify(systemInfo));
};

const removeInvalidApp = async () => {
  const localAppList: any = await getLocalConfig("kp_app");
  const coreApp: any = await getLocalConfig("kp_core_app");
  const allAppList: any = [
    ...localAppList.map((ite: any) => ite.app_id),
    ...coreApp.map((ite: any) => ite.app_id),
  ];
  const localAppPath = path.join(app.getPath("userData"), "system", "app");
  try {
    const appList = fs.readdirSync(localAppPath);
    console.log("allAppList", allAppList);
    appList.forEach((item) => {
      console.log("item", item);
      const appPath = path.join(localAppPath, item);
      if (!allAppList.includes(item)) {
        console.log("qaq", appPath);
        //删除文件夹
        fsExtra.remove(appPath);
      }
    });
  } catch (err) {
    console.log("err", err);
    // fsExtra.ensureDirSync(localAppPath);
  }
};

async function createWindow() {
  await initDatabase();
  await removeInvalidApp();
  win = new BrowserWindow({
    width: VITE_DEV_SERVER_URL ? 1400 : 1200,
    height: 1270,
    title: "Main window",
    icon: path.join(process.env.VITE_PUBLIC, "favicon.ico"),
    resizable: false,
    webPreferences: {
      preload,
      // Warning: Enable nodeIntegration and disable contextIsolation is not secure in production
      // nodeIntegration: true,

      // Consider using contextBridge.exposeInMainWorld
      // Read more on https://www.electronjs.org/docs/latest/tutorial/context-isolation
      // contextIsolation: false,
    },
  });

  await startCoreApp();

  if (VITE_DEV_SERVER_URL) {
    // #298
    win.loadURL(VITE_DEV_SERVER_URL);
    // Open devTool if the app is not packaged
    win.webContents.openDevTools();
  } else {
    win.loadFile(indexHtml);
  }

  // Test actively push message to the Electron-Renderer
  win.webContents.on("did-finish-load", () => {
    win?.webContents.send("main-process-message", new Date().toLocaleString());
  });

  // Make all links open with the browser, not with the application
  win.webContents.setWindowOpenHandler(({ url }) => {
    if (url.startsWith("https:")) shell.openExternal(url);
    return { action: "deny" };
  });
  //关闭菜单
  win.setMenu(null);

  win.on("closed", () => {
    win = null;

    mainWindow.forEach((win) => win.close());
    mainProcess.forEach((proc) => {
      const pid = proc.pid;
      if (pid) {
        killProcessTree(pid);
      }
    });
  });

  // Auto update
  update(win);
}

app.whenReady().then(createWindow);

app.on("window-all-closed", () => {
  console.log("window-all-closed");
  win = null;
  mainWindow.forEach((win) => win.close());
  mainProcess.forEach((proc) => {
    const pid = proc.pid;
    if (pid) {
      killProcessTree(pid);
    }
  });
  if (process.platform !== "darwin") app.quit();
});

app.on("second-instance", () => {
  if (win) {
    // Focus on the main window if the user tried to open another
    if (win.isMinimized()) win.restore();
    win.focus();
  }
});

ipcMain.on("colse", (e) => {
  e.preventDefault();
});

app.on("activate", () => {
  const allWindows = BrowserWindow.getAllWindows();
  if (allWindows.length) {
    allWindows[0].focus();
  } else {
    createWindow();
  }
});

ipcMain.on("kp-system", (event, arg) => {
  const { type, data } = arg;
  switch (type) {
    case "check-core-update":
      checkCoreUpdate(event, data);
      break;
    case "get-app-list":
      getLocalApp(event, data);
      break;
    case "start-app":
      startApp(event, data);
      break;
    case "install-app":
      installApp(event, data);
      break;
    case "restart-app":
      restartApp();
      break;
    case "get-system-info":
      getSystemInfo(event);
      break;
    case "open-debug":
      startDebug(event);
      break;
    default:
      break;
  }
});

// New window example arg: new windows url
ipcMain.handle("open-win", (_, arg) => {
  const childWindow = new BrowserWindow({
    webPreferences: {
      preload,
      nodeIntegration: true,
      contextIsolation: false,
    },
  });

  if (VITE_DEV_SERVER_URL) {
    childWindow.loadURL(`${VITE_DEV_SERVER_URL}#${arg}`);
  } else {
    childWindow.loadFile(indexHtml, { hash: arg });
  }
});
