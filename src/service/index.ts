import axios, { AxiosRequestConfig, AxiosRequestHeaders } from "axios";
import { Spin, message } from "antd";
import ReactDOM from "react-dom/client";
import React from "react";
import LoadingCom from "@/components/loading/loading"; // 确保路径正确

export interface Server_Headers extends AxiosRequestConfig {}

const instance = axios.create({
  baseURL: "http://127.0.0.1:3001",
  timeout: 10000,
  headers: {
    isLoading: true,
  },
});

instance.interceptors.request.use(
  (config) => {
    return config;
  },
  (error) => {
    // 判断当前请求是否设置了不显示Loading
    if (error.config.headers.isLoading !== false) {
    }

    return Promise.reject(error);
  }
);

instance.interceptors.response.use(
  (response) => {
    return response.data;
  },
  (error) => {
    return Promise.reject(error);
  }
);

export default instance;
