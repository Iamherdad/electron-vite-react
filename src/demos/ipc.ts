window.ipcRenderer.on("main-process-message", (_event, ...args) => {
  console.log("[Receive Main-process message]:", ...args);
});

window.ipcRenderer.on("install-core-app", (event, arg) => {
  console.log("异常页面");
});
