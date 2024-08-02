import React, { useEffect } from "react";
import AppItem from "../app-item/App-item";

import styles from "./app-list.module.css";

import type, { AppItemProps } from "../app-item/App-item";
interface AppListProps {
  type: number;
}

const MOCK_DATA = [
  {
    name: "AI小鲲图形化编程",
    desc: "适配核心板新增功能：“视觉模块识别到标签的角度”和“视觉模块识别到标签的距离”。",
    icon: "https://office-site-1306029847.cos.ap-shanghai.myqcloud.com/upload/20230804/f477216530c582c879ff61938509eb4e/IP2.png",
    appResource: "http://cdn.bilibili.games/online_dev.zip",
    startPath: "/index.html",
    startType: "webview",
    version: "0.0.1",
    extensions: [
      {
        name: "linkserver",
        desc: "连接网络服务器",
        icon: "http://cdn.bilibili.games/%E4%B8%8B%E8%BD%BD.png",
        appResource: "http://cdn.bilibili.games/linkserver.zip",
        startPath: "/linkserver.exe",
        startType: "exe",
      },
    ],
  },
  {
    name: "AI小鹏图形化编程",
    desc: "适配核心板新增功能：“视觉模块识别到标签的角度”和“视觉模块识别到标签的距离”。",
    icon: "https://office-site-1306029847.cos.ap-shanghai.myqcloud.com/upload/20230407/0a98d52f02f9ef3d239f6bfaa981bf4f/08.png",
    version: "0.0.2",
    extensions: [
      {
        name: "linkserver",
        desc: "连接网络服务器",
        icon: "http://cdn.bilibili.games/%E4%B8%8B%E8%BD%BD.png",
        appResource: "http://cdn.bilibili.games/linkserver.zip",
        startPath: "/linkserver.exe",
        startType: "exe",
      },
    ],
  },
  {
    name: "模拟器",
    desc: "适配核心板新增功能：“视觉模块识别到标签的角度”和“视觉模块识别到标签的距离”。",
    icon: "http://cdn.bilibili.games/simulator_icon.png",
    version: "0.0.3",
    extensions: [
      {
        name: "linkserver",
        desc: "连接网络服务器",
        icon: "http://cdn.bilibili.games/%E4%B8%8B%E8%BD%BD.png",
        appResource: "http://cdn.bilibili.games/linkserver.zip",
        startPath: "/linkserver.exe",
        startType: "exe",
      },
      {
        name: "小鲲图形化编程",
        desc: "连接网络服务器",
        icon: "https://office-site-1306029847.cos.ap-shanghai.myqcloud.com/upload/20230804/f477216530c582c879ff61938509eb4e/IP2.png",
        appResource: "http://cdn.bilibili.games/online_dev.zip",
        startPath: "/index.html",
        startType: "webview",
      },
    ],
  },
];

const AppList: React.FC<AppListProps> = (props) => {
  const { type } = props;
  const [data, setData] = React.useState<AppItemProps[]>([]);
  useEffect(() => {
    window.ipcRenderer.send("get-app-list", data);
    window.ipcRenderer.on("get-app-list-reply", (event, arg) => {
      if (type == 1) {
        setData(JSON.parse(arg));
      } else {
        setData(MOCK_DATA as AppItemProps[]);
      }
      console.log("渲染进程获取数据", JSON.parse(arg));
    });
  }, []);

  return (
    <div className={styles.container}>
      {data.map((item, index) => {
        return <AppItem key={index} type={type} {...item} />;
      })}
    </div>
  );
};

export default AppList;
