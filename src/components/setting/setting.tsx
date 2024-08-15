import React, { FC, useEffect } from "react";
import styles from "./setting.module.css";
import { Button, App } from "antd";
import systemContext from "@/context/systemContext";
import dayjs from "dayjs";

const Setting: FC = () => {
  const { systemInfo } = React.useContext(systemContext);
  const { coreVersion, coreLastUpdate, softVersion } = systemInfo;
  const [loading, setLoading] = React.useState(false);
  const btnText = loading ? "运行中" : "启动";
  const { message } = App.useApp();
  useEffect(() => {
    window.ipcRenderer.on("open-debug-success", (event, arg) => {
      console.log("open-debug-success");
      setLoading(false);
      message.success("系统修复成功，重启后生效");
    });

    window.ipcRenderer.on("open-debug-fail", (event, arg) => {
      console.log("open-debug-fail");
      setLoading(false);
      message.error("系统修复失败，请重新安装软件");
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

  return (
    <div>
      <p>软件版本:{softVersion}</p>
      <p>内核版本:{coreVersion}</p>
      <p>内核最后更新时间:{fomateTime(coreLastUpdate)}</p>
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
