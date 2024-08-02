import { Input } from "antd";
import SearchBox from "../search/Search";
import Tabs from "../tabs/Tabs";

import styles from "./layout.module.css";

const Layout = (): JSX.Element => {
  return (
    <div className={styles.main}>
      <div className={styles.search}>
        <h3>大鱼AI编程助手 v0.0.1</h3>
        &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;
        {/* <SearchBox /> */}
      </div>
      <div className={styles.tabs}>
        <Tabs />
      </div>
    </div>
  );
};

export default Layout;
