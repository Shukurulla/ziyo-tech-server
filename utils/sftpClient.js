// utils/sftpClient.js
import SftpClient from "ssh2-sftp-client";
import dotenv from "dotenv";

const config = {
  host: "45.134.39.117",
  port: 22,
  username: "root",
  password: "CH7aQhydDipRB9b1Jjrv",
};

// Qo‘shimcha tekshiruv
if (!config.password) {
  throw new Error("SERVER_PASSWORD muhit o‘zgaruvchisi sozlanmagan");
}

export async function uploadFileSFTP(buffer, remotePath) {
  const client = new SftpClient();
  try {
    await client.connect(config);

    // 🔽 Papka bor yoki yo‘qligini tekshirib, bo‘lmasa yaratamiz
    const remoteDir = remotePath.substring(0, remotePath.lastIndexOf("/"));
    const exists = await client.exists(remoteDir);
    if (!exists) {
      await client.mkdir(remoteDir, true); // recursive = true
    }

    await client.put(buffer, remotePath);
  } catch (err) {
    console.error("SFTP upload xatosi:", err.message);
    throw err;
  } finally {
    try {
      await client.end();
    } catch (e) {
      console.warn("SFTP end xatosi:", e.message);
    }
  }
}

export async function deleteFileSFTP(remotePath) {
  const client = new SftpClient();
  try {
    await client.connect(config);
    await client.delete(remotePath);
  } catch (err) {
    console.error("SFTP delete xatosi:", err.message);
    throw err;
  } finally {
    try {
      await client.end();
    } catch (e) {
      console.warn("SFTP end xatosi:", e.message);
    }
  }
}
