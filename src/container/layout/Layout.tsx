import React, { useEffect, useState } from "react";
import { Input, Drawer, Button, Flex, Layout, Menu } from "antd";
import { SettingOutlined } from "@ant-design/icons";

import styles from "./layout.module.css";
import Setting from "@/components/setting/setting";
import systemContext from "@/context/systemContext";
import { useNavigate, Outlet, useLocation } from "react-router-dom";

const { Sider, Content } = Layout;

const App: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { systemInfo } = React.useContext(systemContext);
  const { softVersion } = systemInfo;
  const [open, setOpen] = useState(false);
  const settingClick = () => {
    setOpen(true);
  };
  const onClose = () => {
    setOpen(false);
  };

  const handleItemClick = (item: { key: string }) => {
    navigate(`/${item.key}`, { replace: true });
  };

  const labels = [
    {
      key: "local",
      label: "已安装",
      onClick: handleItemClick,
    },
    {
      key: "all",
      label: "全部",
      onClick: handleItemClick,
    },
  ];

  const items = labels.map((ite, index) => ({
    key: ite.key,
    label: ite.label,
    onClick: handleItemClick,
  }));

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h3>大鱼AI编程助手 v{softVersion}</h3>
        <div className={styles.setting}>
          <div onClick={settingClick}>
            <SettingOutlined />
          </div>
        </div>
        &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;
      </div>
      <div className={styles.tabs}>
        <Layout className={styles.layout}>
          <Layout>
            <Sider width="10%" className={styles.sider}>
              <Menu
                mode="inline"
                defaultSelectedKeys={[labels[0].key]}
                items={items}
                className={styles.menu}
              />
            </Sider>
            <Content className={styles.content}>
              <Outlet />
            </Content>
          </Layout>
        </Layout>
        <Drawer title="设置" onClose={onClose} open={open}>
          <Setting />
        </Drawer>
      </div>
    </div>
  );
};

export default App;

// const Layout = (): JSX.Element => {
//   const { systemInfo } = React.useContext(systemContext);
//   const { softVersion } = systemInfo;
//   const [open, setOpen] = useState(false);
//   const settingClick = () => {
//     setOpen(true);
//   };

//   const showDrawer = () => {
//     setOpen(true);
//   };

//   const onClose = () => {
//     setOpen(false);
//   };

//   return (
//     <div className={styles.main}>
//       <div className={styles.header}>
//         <h3>大鱼AI编程助手 v{softVersion}</h3>
//         <div className={styles.setting}>
//           <div onClick={settingClick}>
//             <SettingOutlined />
//           </div>
//         </div>
//         &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;
//       </div>
//       <div className={styles.tabs}>
//         {/* <Tabs /> */}
//         <Drawer title="设置" onClose={onClose} open={open}>
//           <Setting />
//         </Drawer>
//       </div>
//     </div>
//   );
// };

// export default Layout;
