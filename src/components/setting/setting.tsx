import React, { FC } from "react";
import styles from "./setting.module.css";
import { Button } from "antd";
import systemContext from "@/context/systemContext";
import dayjs from "dayjs";

const Setting: FC = () => {
  const { systemInfo } = React.useContext(systemContext);
  const { coreVersion, coreLastUpdate, softVersion } = systemInfo;

  const fomateTime = (time: number) => {
    return dayjs(time).format("YYYY-MM-DD HH:mm:ss");
  };
  console.log(systemInfo);
  return (
    <div>
      <p>软件版本:{softVersion}</p>
      <p>内核版本:{coreVersion}</p>
      <p>内核最后更新时间:{fomateTime(coreLastUpdate)}</p>
      <div>
        系统修复工具：<Button type="primary">启动</Button>
      </div>
    </div>
  );
};

export default Setting;
