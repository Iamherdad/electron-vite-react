import { app, BrowserWindow, shell, ipcMain } from "electron";
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
} from "../utils/utils";
import http from "http";
import * as child_process from "child_process";
import axios from "axios";
import * as unzipper from "unzipper";
import { message } from "antd";

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

//处理扩展item
const processItem = (targetPath: string, item: any): any | null => {
  const { name, startPath } = item;

  const basePath = path.join(targetPath, name);
  const fullStartPath = path.join(basePath, `resources/${startPath}`);

  if (!fs.existsSync(fullStartPath)) {
    return null;
  }

  return {
    ...item,
    startPath: fullStartPath,
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
    .filter((item) => item !== null)
    .sort((a, b) => {
      return a.createDate < b.createDate ? 1 : -1;
    });
  return result;
};
//
const startApp = async (event: Electron.IpcMainEvent, appConfig: any) => {
  const config = JSON.parse(appConfig);
  const { name, version, startPath, startType, icon } = config;

  // 根据 startType 打开不同类型的窗口
  if (startType === "webview") {
    mainWindow.set(
      name,
      new BrowserWindow({
        webPreferences: {
          nodeIntegration: true,
          contextIsolation: false,
        },
      })
    );
    const window = mainWindow.get(name);
    if (window) {
      window.loadURL(`file://${startPath}`);

      // 通知渲染进程主窗口已打开
      event.reply("main-process-status", { name: name, status: "running" });
    }

    mainWindow.get(name)?.on("closed", () => {
      mainWindow.delete(name);
      // 通知渲染进程主窗口已关闭
      event.reply("main-process-status", { name: name, status: "closed" });
    });
  } else if (startType === "exe") {
    mainProcess.set(name, child_process.spawn(startPath, { shell: false }));
    const process = mainProcess.get(name);

    if (process) {
      console.log("processStart", process.pid);
      process.on("exit", () => {
        const pid = process.pid;
        if (pid) {
          killProcessTree(pid);
        }

        mainProcess.delete(name);
        // 通知渲染进程主进程已退出
        event.reply("main-process-status", { name: name, status: "closed" });
      });
      // 通知渲染进程主进程已启动
      event.reply("main-process-status", { name: name, status: "running" });
    }
  }
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
  } = config;
  const userDataPath = app.getPath("userData");
  const targetPath = path.join(userDataPath, "system", "app", name);
  const backupPath = path.join(userDataPath, "system", "backup", name);
  const downloadPath = path.join(userDataPath, "system", "download", name);
  try {
    // 创建下载目录
    await fsExtra.ensureDir(downloadPath);

    event.reply("install-app-status", {
      name,
      status: "pending",
      message: "下载资源...",
    });

    // 下载资源文件
    try {
      const appResourceFile = await axios.get(appResource, {
        responseType: "arraybuffer",
      });
      // 写入资源文件
      await fs.promises.writeFile(
        path.join(downloadPath, "resources.zip"),
        Buffer.from(appResourceFile.data)
      );
      event.reply("install-app-status", {
        name,
        status: "pending",
        message: "解压资源...",
      });
      // 解压资源文件
      await extractZipFile(
        path.join(downloadPath, "resources.zip"),
        downloadPath
      );
      // 删除压缩文件
      await fs.promises.unlink(path.join(downloadPath, "resources.zip"));
      event.reply("install-app-status", {
        name,
        status: "pending",
        message: "处理文件...",
      });
      // 处理解压后的文件
      await handleExtractedFiles(downloadPath);
      // 转换icon为base64
      const iconBase64 = await convertIconToBase64(icon);
      let createDate = 0;
      if (isUpdate) {
        const appConfig = fs.readFileSync(
          path.join(targetPath, "config.json"),
          "utf-8"
        );
        createDate = JSON.parse(appConfig).createDate;
      } else {
        createDate = +new Date();
      }
      const updateDate = +new Date();
      const configData = {
        name,
        desc,
        icon: iconBase64,
        version,
        startPath,
        startType,
        updateDate,
        createDate,
      };

      // 检查startPath是否存在
      if (!fs.existsSync(path.join(downloadPath, "resources", startPath))) {
        throw new Error("startPath does not exist");
      }
      event.reply("install-app-status", {
        name,
        status: "pending",
        message: "写入配置...",
      });
      // 写入config
      await fs.promises.writeFile(
        path.join(downloadPath, "config.json"),
        JSON.stringify(configData),
        "utf-8"
      );
      // 处理扩展
      await backupAndInstall(targetPath, backupPath, downloadPath);
      // 通知渲染进程安装成功
      event.reply("install-app-status", {
        name,
        status: "success",
        message: `${name}安装成功`,
      });
    } catch (err) {
      throw Error("网络环境不佳，请稍后再试");
    }
  } catch (error: any) {
    await fsExtra.remove(downloadPath);
    event.reply("install-app-status", {
      name: JSON.parse(appConfig).name,
      message: error.message,
      status: "fail",
    });
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
  if (fs.existsSync(targetPath)) {
    await fsExtra.remove(backupPath).catch(() => {});
    await fsExtra.move(targetPath, backupPath);
  }
  await fsExtra.remove(targetPath).catch(() => {});
  try {
    await fsExtra.move(downloadPath, targetPath);
  } catch (e) {
    await fsExtra.move(backupPath, targetPath);
    throw e;
  }
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
