import React, { FC } from "react";
import styles from "./setting.module.css";
import { Button } from "antd";

const Setting: FC = () => {
  return (
    <div>
      <p>软件版本:0.0.1</p>
      <p>内核版本:0.0.1</p>
      <div>
        系统修复工具：<Button type="primary">启动</Button>
      </div>
    </div>
  );
};

export default Setting;
