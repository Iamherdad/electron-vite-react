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
      console.log("内核更新已就绪", arg);
      api.open({
        message: `软件内核更新v${version}`,
        description: updateDesc,
        btn,
        onClose: () => {},
      });
    });
  }, []);

  const btn = (
    <Button type="primary" size="small" onClick={() => {}}>
      {" "}
      立即更新{" "}
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
