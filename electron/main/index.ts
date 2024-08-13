import { app, BrowserWindow, shell, ipcMain } from "electron";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";
import path from "node:path";
import os from "node:os";
import fs from "node:fs";
import * as fsExtra from "fs-extra";
import { update } from "./update";
import { extractZipFile, convertIconToBase64 } from "../utils/utils";
import http from "http";
import * as child_process from "child_process";
import axios from "axios";
import * as unzipper from "unzipper";

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

//扩展窗口
let mainWindow: BrowserWindow | null = null;
let mainProcess: child_process.ChildProcess | null = null;
const extensionWindows: BrowserWindow[] = [];
const extensionProcesses: child_process.ChildProcess[] = [];
let mainName = "";

//处理扩展item
const processItem = (targetPath: string, item: any): any | null => {
  const { name, startPath, extensions } = item;

  const basePath = path.join(targetPath, name);
  const fullStartPath = path.join(basePath, `resources/${startPath}`);

  if (!fs.existsSync(fullStartPath)) {
    return null;
  }

  return {
    ...item,
    startPath: fullStartPath,
    extensions: extensions
      ? extensions
      : []
          .map((extension: any) => {
            const { name: extName, startPath: extStartPath } = extension;
            const fullExtStartPath = path.join(
              basePath,
              `extensions/${extName}/resources/${extStartPath}`
            );

            if (!fs.existsSync(fullExtStartPath)) {
              return null;
            }

            return {
              ...extension,
              startPath: fullExtStartPath,
            };
          })
          .filter((ext: any) => ext !== null),
  };
};

//获取本地应用配置
const getLocalAppConfig = async () => {
  // 获取用户数据目录
  const userDataPath = app.getPath("userData");
  console.log("userDataPath", userDataPath);
  const targetPath = path.join(userDataPath, "system", "app");

  // 检查并创建 targetPath 目录
  fsExtra.ensureDirSync(targetPath);
  const files = fs.readdirSync(targetPath); // 同步读取目录
  if (!files) {
    return;
  }
  const confingList = [];

  for (let i = 0; i < files.length; i++) {
    //判断是否为文件夹并且是否存在config.json
    const stat = fs.statSync(path.join(targetPath, files[i]));
    if (!stat.isDirectory()) {
      continue;
    }

    if (!fs.existsSync(path.join(targetPath, files[i], "config.json"))) {
      continue;
    }

    const appConfig = fs.readFileSync(
      path.join(targetPath, files[i], "config.json"),
      "utf-8"
    );

    confingList.push(JSON.parse(appConfig));
  }

  const result = confingList
    .map((item: any) => processItem(targetPath, item))
    .filter((item) => item !== null);
  return result;
};
//
const startApp = async (event: Electron.IpcMainEvent, appConfig: any) => {
  const config = JSON.parse(appConfig);
  const { name, version, startPath, startType, extensions, icon } = config;
  mainName = name;

  // 根据 startType 打开不同类型的窗口
  if (startType === "webview") {
    mainWindow = new BrowserWindow({
      webPreferences: {
        nodeIntegration: true,
        contextIsolation: false,
      },
    });

    mainWindow.loadURL(`file://${startPath}`);
    // 通知渲染进程主窗口已打开
    event.reply("main-process-status", { name: name, status: "running" });
  } else if (startType === "exe") {
    mainProcess = child_process.spawn(startPath);
    // 通知渲染进程主进程已启动
    event.reply("main-process-status", { name: name, status: "running" });

    mainProcess.on("exit", () => {
      // extensionWindows.forEach((win) => win.close());
      // extensionProcesses.forEach((proc) => proc.kill());
      mainProcess?.kill();
      mainProcess = null;
      // 通知渲染进程主进程已退出

      event.reply("main-process-status", { name: name, status: "closed" });
    });
  }

  // 监听主窗口关闭事件，关闭所有扩展窗口或进程
  if (mainWindow) {
    mainWindow.on("closed", () => {
      // extensionWindows.forEach((win) => win.close());
      // extensionProcesses.forEach((proc) => proc.kill());
      mainWindow = null;
      mainName = "";
      // 通知渲染进程主窗口已关闭
      event.reply("main-process-status", { name: name, status: "closed" });
    });
  }
};

const installApp = async (event: Electron.IpcMainEvent, appConfig: string) => {
  const config = JSON.parse(appConfig);
  const { name, desc, icon, appResource, startPath, startType, version } =
    config;
  const userDataPath = app.getPath("userData");
  const targetPath = path.join(userDataPath, "system", "app", name);
  const backupPath = path.join(userDataPath, "system", "backup", name);
  const downloadPath = path.join(userDataPath, "system", "download", name);
  try {
    // 创建下载目录
    await fsExtra.ensureDir(downloadPath);

    // const appResourcePath = path.join(downloadPath, "resources");
    // await fsExtra.ensureDir(appResourcePath);
    // 下载资源文件
    const appResourceFile = await axios.get(appResource, {
      responseType: "arraybuffer",
    });
    // 写入资源文件
    await fs.promises.writeFile(
      path.join(downloadPath, "resources.zip"),
      Buffer.from(appResourceFile.data)
    );
    // 解压资源文件
    await extractZipFile(
      path.join(downloadPath, "resources.zip"),
      downloadPath
    );
    // 删除压缩文件
    await fs.promises.unlink(path.join(downloadPath, "resources.zip"));

    // 处理解压后的文件
    await handleExtractedFiles(downloadPath);
    // 转换icon为base64
    const iconBase64 = await convertIconToBase64(icon);

    const configData = {
      name,
      desc,
      icon: iconBase64,
      version,
      startPath,
      startType,
    };
    // 检查startPath是否存在
    if (!fs.existsSync(path.join(downloadPath, "resources", startPath))) {
      throw new Error("startPath does not exist");
    }
    // 写入config
    await fs.promises.writeFile(
      path.join(downloadPath, "config.json"),
      JSON.stringify(configData),
      "utf-8"
    );
    // 处理扩展
    await backupAndInstall(targetPath, backupPath, downloadPath);
    // 通知渲染进程安装成功
    event.reply("install-app-status", { name, status: "success" });
  } catch (error) {
    await fsExtra.remove(downloadPath);
    event.reply("install-app-status", {
      name: JSON.parse(appConfig).name,
      status: "fail",
    });
    console.error("Error during installation:", error);
  }
};
//处理解压后的文件
async function handleExtractedFiles(downloadPath: string) {
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
  }
}

//备份并安装
async function backupAndInstall(
  targetPath: string,
  backupPath: string,
  downloadPath: string
) {
  //如果目标目录存在，先备份
  if (fs.existsSync(targetPath)) {
    await fsExtra.remove(backupPath).catch(() => {});
    await fsExtra.move(targetPath, backupPath);
  }
  await fsExtra.remove(targetPath).catch(() => {});
  await fsExtra.move(downloadPath, targetPath);
}

async function createWindow() {
  win = new BrowserWindow({
    width: 1500,
    height: 1270,
    title: "Main window",
    icon: path.join(process.env.VITE_PUBLIC, "favicon.ico"),
    webPreferences: {
      preload,
      // Warning: Enable nodeIntegration and disable contextIsolation is not secure in production
      // nodeIntegration: true,

      // Consider using contextBridge.exposeInMainWorld
      // Read more on https://www.electronjs.org/docs/latest/tutorial/context-isolation
      // contextIsolation: false,
    },
  });

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
    mainWindow?.close();
    mainProcess?.kill();
    // extensionWindows.forEach((win) => win.close());
    // extensionProcesses.forEach((proc) => proc.kill());
  });

  // Auto update
  update(win);
}

app.whenReady().then(createWindow);

app.on("window-all-closed", () => {
  console.log("window-all-closed");
  win = null;
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
  console.log("close");
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

//获取本地应用列表
ipcMain.on("get-app-list", async (event, arg) => {
  const res = await getLocalAppConfig();
  event.reply("get-app-list-reply", JSON.stringify(res));
});

//启动app
ipcMain.on("start-app", startApp);

//安装app
ipcMain.on("install-app", installApp);

//重启扩展
// ipcMain.on("restart-extension", (event, arg) => {
//   const { name: extName, startPath, startType } = JSON.parse(arg);
//   if (!mainProcess && !mainWindow) return;

//   if (startType === "webview") {
//     const childWindow = new BrowserWindow({
//       webPreferences: {
//         preload,
//         nodeIntegration: true,
//         contextIsolation: false,
//       },
//     });

//     try {
//       childWindow.loadURL(`file://${startPath}`);
//     } catch (err) {
//       console.error(err);
//     }
//     // extensionWindows.push(childWindow);
//     childWindow.on("closed", () => {
//       const index = extensionWindows.indexOf(childWindow);
//       if (index > -1) {
//         extensionWindows.splice(index, 1);
//       }
//       event.reply("extension-status", {
//         mainName: mainName,
//         name: extName,
//         status: "closed",
//       });
//     });

//     event.reply("extension-status", {
//       mainName: mainName,
//       name: extName,
//       status: "running",
//     });
//   } else if (startType === "exe") {
//     const childProcess = child_process.spawn(startPath);
//     extensionProcesses.push(childProcess);
//     childProcess.on("exit", () => {
//       const index = extensionProcesses.indexOf(childProcess);
//       if (index > -1) {
//         extensionProcesses.splice(index, 1);
//       }
//       event.reply("extension-status", {
//         mainName: mainName,
//         name: extName,
//         status: "closed",
//       });
//     });
//     event.reply("extension-status", {
//       mainName: mainName,
//       name: extName,
//       status: "running",
//     });
//   }
// });

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
