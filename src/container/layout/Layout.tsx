import React, { useState } from "react";
import { Input, Drawer, Button } from "antd";
import SearchBox from "../search/Search";
import Tabs from "../tabs/Tabs";

import styles from "./layout.module.css";

const Layout = (): JSX.Element => {
  const [open, setOpen] = useState(false);
  const settingClick = () => {
    setOpen(true);
  };

  const showDrawer = () => {
    setOpen(true);
  };

  const onClose = () => {
    setOpen(false);
  };

  return (
    <div className={styles.main}>
      <div className={styles.header}>
        <h3>大鱼AI编程助手 v0.0.1</h3>
        <div className={styles.setting}>
          <div onClick={settingClick}>设置</div>
        </div>
        &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;
        {/* <SearchBox /> */}
      </div>
      <div className={styles.tabs}>
        <Tabs />
        <Drawer title="设置" onClose={onClose} open={open}>
          <p>系统版本:0.0.1</p>
          <p>内核版本:0.0.1</p>
          <p>声明：禁止参与非法用途</p>
          <Button type="primary">系统修复</Button>
        </Drawer>
      </div>
    </div>
  );
};

export default Layout;
