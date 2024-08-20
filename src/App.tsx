import React, { useEffect, useState } from "react";
import { Button, ConfigProvider, notification, App as AntAPP } from "antd";
import { RouterProvider } from "react-router-dom";
import Layout from "./container/layout/Layout";
import router from "./router/router";
import systemContext, {
  SystemInfo,
  defaultSystemInfo,
} from "./context/systemContext";
import "./App.css";

function App() {
  const [api, contextHolder] = notification.useNotification();
  const [systemInfo, setSystemInfo] = useState<SystemInfo>(defaultSystemInfo);
  const [localAppList, setLocalAppList] = useState([]);
  useEffect(() => {
    window.ipcRenderer.send("kp-system", {
      type: "check-core-update",
      data: [],
    });

    window.ipcRenderer.send("kp-system", {
      type: "get-system-info",
      data: [],
    });

    window.ipcRenderer.on("check-core-update-reply", (event, arg) => {
      const data = JSON.parse(arg);
      const { version, updateDesc } = data;
      api.open({
        message: `软件内核更新v${version}已就绪,重启后生效`,
        description: updateDesc,
        btn: <Button onClick={handleRestartClick}>立即重启</Button>,
        onClose: () => {},
      });
    });

    window.ipcRenderer.on("get-system-info-reply", (event, arg) => {
      setSystemInfo(JSON.parse(arg) as SystemInfo);
    });

    window.ipcRenderer.on("get-app-list-reply", (event, arg) => {
      console.log("渲染进程获取数据", JSON.parse(arg));
      setLocalAppList(JSON.parse(arg));
    });

    window.ipcRenderer.on("uninstall-app", (event, arg) => {
      window.ipcRenderer.send("kp-system", {
        type: "get-app-list",
        data: [],
      });
    });
  }, []);

  const handleRestartClick = () => {
    window.ipcRenderer.send("kp-system", {
      type: "restart-app",
      data: [],
    });
  };

  return (
    <>
      <ConfigProvider
        theme={{
          components: {
            Tabs: {
              itemSelectedColor: "#fff",
              cardBg: "#dde3e9",
              titleFontSizeLG: 25,
              itemColor: "#909196",
            },
            Menu: {
              itemSelectedBg: "#2d8cff",
              itemSelectedColor: "#fff",
              itemColor: "#95a4bc",
              itemBg: "#dde3e9",
              fontSize: 20,
            },
          },
        }}
      >
        <AntAPP>
          {contextHolder}
          <systemContext.Provider value={{ systemInfo, localAppList }}>
            <RouterProvider router={router}></RouterProvider>
          </systemContext.Provider>
        </AntAPP>
      </ConfigProvider>
    </>
  );
}

export default App;
