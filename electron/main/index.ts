import { app, BrowserWindow, shell, ipcMain } from "electron";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";
import path from "node:path";
import os from "node:os";
import fs from "node:fs";
import * as fsExtra from "fs-extra";
import { update } from "./update";
import { extractZipFile } from "../utils/utils";
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

const installApp = async (event: Electron.IpcMainEvent, appConfig: any) => {
  const config = JSON.parse(appConfig);
  const { name, desc, icon, appResource, startPath, startType, version } =
    config;
  const userDataPath = app.getPath("userData");
  const targetPath = path.join(userDataPath, "system", "app", name);
  const backupPath = path.join(userDataPath, "system", "backup", name);
  const downloadPath = path.join(userDataPath, "system", "download", name);

  try {
    // 创建临时下载目录
    await fsExtra.ensureDir(downloadPath);

    // 下载
    const appResourceFile = await axios.get(appResource, {
      responseType: "arraybuffer",
    });
    const appResourcePath = path.join(downloadPath, "resources");

    await fsExtra.ensureDir(appResourcePath);

    // await new Promise((resolve, reject) => {
    //   const writer = fs.createWriteStream(
    //     path.join(appResourcePath, "resources.zip"),
    //     {
    //       encoding: "binary",
    //     }
    //   );
    //   writer.write(Buffer.from(appResourceFile.data), (err) => {
    //     if (err) reject(err);
    //     else {
    //       writer.close(); // 确保文件流已关闭
    //       resolve();
    //     }
    //   });
    // });

    await fs.promises.writeFile(
      path.join(appResourcePath, "resources.zip"),
      Buffer.from(appResourceFile.data),
      { encoding: "binary" }
    );
    console.log("download success");

    // 解压
    await extractZipFile(
      path.join(appResourcePath, "resources.zip"),
      appResourcePath
    );
    console.log("extract success");

    // 删除下载的压缩包
    await fs.promises.unlink(path.join(appResourcePath, "resources.zip")); // 使用异步方法删除文件
    console.log("delete success");

    //将icon链接转换为base64
    const iconData = await axios.get(icon, {
      responseType: "arraybuffer",
    });
    const contentType = iconData.headers["content-type"];
    const iconBase64 = `data:${contentType};base64,${Buffer.from(
      iconData.data
    ).toString("base64")}`;

    //创建配置文件config.json
    const config = {
      name,
      desc,
      icon: iconBase64,
      version,
      startPath,
      startType,
    };
    await fs.promises.writeFile(
      path.join(downloadPath, "config.json"),
      JSON.stringify(config),
      "utf-8"
    );

    // 备份原有文件
    if (fs.existsSync(targetPath)) {
      await fsExtra.move(targetPath, backupPath);
    }

    // 移动文件
    try {
      await fsExtra.move(downloadPath, targetPath);
      console.log("install success");
      // 通知渲染进程安装成功
      event.reply("install-app-status", { name, status: "success" });
    } catch (e) {
      console.log(e);
      // 通知渲染进程安装失败
      event.reply("install-app-status", { name, status: "fail" });
      // 删除下载的文件
      await fsExtra.remove(downloadPath);
      // 恢复备份文件
      if (fs.existsSync(backupPath)) {
        await fsExtra.move(backupPath, targetPath);
      }
    }
  } catch (error: any) {
    // 下载失败，删除下载的文件
    await fsExtra.remove(downloadPath);
    // 通知渲染进程安装失败
    event.reply("install-app-status", { name, status: "fail" });
    console.error("Error during installation:", error);
  }
};
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
