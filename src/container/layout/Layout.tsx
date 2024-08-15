import React, { useState } from "react";
import { Input, Drawer, Button } from "antd";
import { SettingOutlined } from "@ant-design/icons";
import SearchBox from "../search/Search";
import Tabs from "../tabs/Tabs";

import styles from "./layout.module.css";
import Setting from "@/components/setting/setting";
import systemContext from "@/context/systemContext";
const Layout = (): JSX.Element => {
  const { systemInfo } = React.useContext(systemContext);
  const { softVersion } = systemInfo;
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
        <h3>大鱼AI编程助手 v{softVersion}</h3>
        <div className={styles.setting}>
          <div onClick={settingClick}>
            <SettingOutlined />
          </div>
        </div>
        &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;
        {/* <SearchBox /> */}
      </div>
      <div className={styles.tabs}>
        <Tabs />
        <Drawer title="设置" onClose={onClose} open={open}>
          <Setting />
        </Drawer>
      </div>
    </div>
  );
};

export default Layout;
