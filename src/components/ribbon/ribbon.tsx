import React from "react";
import { Popover } from "antd";
import styles from "./ribbon.module.css";

const Ribbon: React.FC = () => {
  return (
    <Popover
      content={"修复已知问题，优化产品体验"}
      title="更新内容"
      placement="bottom"
    >
      <div className={styles.container}>New</div>
    </Popover>
  );
};

export default Ribbon;
