import fs from "fs";
import http from "http";
import path from "path";
import * as unzipper from "unzipper";

const downloadAndExtractZip = async (url: string, dest: string) => {
  const zipPath = path.join(dest, "downloaded.zip");

  // 下载 ZIP 文件
  const file = fs.createWriteStream(zipPath);
  await new Promise((resolve, reject) => {
    http
      .get(url, (response) => {
        response.pipe(file);
        file.on("finish", () => {
          file.close(resolve);
        });
      })
      .on("error", (err) => {
        fs.unlink(zipPath, () => reject(err));
      });
  });

  // 解压 ZIP 文件
  await fs
    .createReadStream(zipPath)
    .pipe(unzipper.Extract({ path: dest }))
    .promise();

  // 删除 ZIP 文件
  fs.unlinkSync(zipPath);

  return dest;
};

export { downloadAndExtractZip };
