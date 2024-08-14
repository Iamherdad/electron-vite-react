import { useEffect, useState } from "react";
import { Button, ConfigProvider, notification } from "antd";
import Layout from "./container/layout/Layout";
import "./App.css";

function App() {
  const [api, contextHolder] = notification.useNotification();
  useEffect(() => {
    window.ipcRenderer.send("kp-system", {
      type: "check-core-update",
      data: [],
    });

    window.ipcRenderer.on("check-core-update-reply", (event, arg) => {
      const data = JSON.parse(arg);
      const { version, updateDesc } = data;
      api.open({
        message: `软件内核更新v${version}已就绪,重启后生效`,
        description: updateDesc,
        btn,
        onClose: () => {},
      });
    });
  }, []);

  const handleRestartClick = () => {
    window.ipcRenderer.send("kp-system", {
      type: "restart-app",
      data: [],
    });
  };

  const btn = (
    <Button type="primary" size="small" onClick={handleRestartClick}>
      立即重启
    </Button>
  );

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
          },
        }}
      >
        {contextHolder}
        <Layout />
      </ConfigProvider>
    </>
  );
}

export default App;
