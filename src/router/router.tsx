import { createBrowserRouter, createHashRouter } from "react-router-dom";
import Layout from "../container/layout/Layout";
import AllApps from "../pages/allApps/allApps";
import InstalledApps from "../pages/localApps/localApps";
import { getAppList, getInstalledAppList } from "../service/api/app";

const router = createHashRouter([
  {
    path: "/",
    element: <Layout />,
    loader: async () => {
      return ["home"];
    },
    children: [
      {
        index: true,
        element: <InstalledApps />,
        loader: getInstalledAppList,
      },
      {
        path: "local",
        element: <InstalledApps />,
        loader: getInstalledAppList,
      },
      {
        path: "all",
        element: <AllApps />,
        loader: getAppList,
      },
    ],
  },
]);

export default router;
