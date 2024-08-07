import React, { FC } from "react";
import { Spin } from "antd";
import styles from "./loading.module.css";
const Loading = (): JSX.Element => {
  return (
    <div className={styles.container}>
      <Spin size="large" tip="加载中" />
    </div>
  );
};

export default Loading;
