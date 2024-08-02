import { useEffect, useState } from "react";
import { ConfigProvider } from "antd";
import Layout from "./container/layout/Layout";
import "./App.css";

function App() {
  return (
    <>
      <ConfigProvider
        theme={{
          components: {
            Tabs: {
              itemSelectedColor: "#fff",
              cardBg: "#dde3e9",
              titleFontSizeLG: 25,
              itemColor: "#909196",
            },
          },
        }}
      >
        <Layout />
      </ConfigProvider>
    </>
  );
}

export default App;
