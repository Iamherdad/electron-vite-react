import React, { FC, useEffect } from "react";
import styles from "./setting.module.css";
import { Button, App } from "antd";
import systemContext from "@/context/systemContext";
import dayjs from "dayjs";

const Setting: FC = () => {
  const { systemInfo } = React.useContext(systemContext);
  const { coreVersion, coreLastUpdate, softVersion } = systemInfo;
  const [loading, setLoading] = React.useState(false);
  const btnText = loading ? "运行中" : "运行";
  const { message: Message, notification } = App.useApp();
  useEffect(() => {
    window.ipcRenderer.on("open-debug-reply", (event, arg) => {
      const { status, message } = JSON.parse(arg);
      switch (status) {
        case "success":
          setLoading(false);
          notification.success({
            message: "系统修复",
            description: "系统修复成功，重启后生效",
            btn: <Button onClick={restartApp}>立即重启</Button>,
          });

          break;
        case "fail":
          setLoading(false);
          notification.error({
            message: "系统修复",
            description: message,
            duration: 2,
          });
          break;
      }
    });
  }, []);
  const fomateTime = (time: number) => {
    return dayjs(time).format("YYYY-MM-DD HH:mm:ss");
  };
  const handleDebugClick = () => {
    window.ipcRenderer.send("kp-system", {
      type: "open-debug",
      data: [],
    });
    setLoading(true);
  };

  const restartApp = () => {
    window.ipcRenderer.send("kp-system", {
      type: "restart-app",
      data: [],
    });
  };

  return (
    <div>
      <p>软件版本：{softVersion}</p>
      <p>内核版本：{coreVersion}</p>
      <p>内核最后更新时间：{fomateTime(coreLastUpdate)}</p>
      <div>
        系统修复工具：
        <Button type="primary" onClick={handleDebugClick} loading={loading}>
          {btnText}
        </Button>
      </div>
    </div>
  );
};

export default Setting;
