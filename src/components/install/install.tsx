import React, { FC, useMemo } from "react";
import { green, red } from "@ant-design/colors";
import { Flex, Progress } from "antd";
import styles from "./install.module.css";

interface IProps {
  text: string;
  name: string;
}

const App: FC<IProps> = (props) => {
  const { text, name } = props;
  const percent = useMemo(() => {
    switch (text) {
      case "下载资源...":
        return 25;
      case "解压资源...":
        return 50;
      case "安装中...":
        return 75;
      case `${name}安装完成`:
        return 100;
      default:
        return 0;
    }
  }, [text]);
  return (
    <div className={styles.container}>
      <Progress percent={percent} steps={4} style={{ width: "100%" }} />
      <div>{text}</div>
    </div>
  );
};

export default App;
