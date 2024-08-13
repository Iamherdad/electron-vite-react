import React from "react";
import { Popover } from "antd";
import styles from "./ribbon.module.css";

interface RibbonProps {
  title?: string;
  content: React.ReactNode;
}

const Ribbon: React.FC<RibbonProps> = (props) => {
  const { title = "更新内容", content } = props;
  return (
    <Popover content={content} title={title} placement="bottom">
      <div className={styles.container}>New</div>
    </Popover>
  );
};

export default Ribbon;
