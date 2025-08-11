// utils/sftpClient.js
import SftpClient from "ssh2-sftp-client";
import dotenv from "dotenv";
import path from "path";
import fs from "fs";
import os from "os";

const config = {
  host: "45.134.39.117",
  port: 22,
  username: "root",
  password: "CH7aQhydDipRB9b1Jjrv",
};

// Qo'shimcha tekshiruv
if (!config.password) {
  throw new Error("SERVER_PASSWORD muhit o'zgaruvchisi sozlanmagan");
}

// Create a temporary directory for file processing if it doesn't exist
const TEMP_DIR = path.join(os.tmpdir(), "ziyo-tech-uploads");
if (!fs.existsSync(TEMP_DIR)) {
  fs.mkdirSync(TEMP_DIR, { recursive: true });
}

/**
 * Optimizes image files before uploading
 * @param {Buffer} buffer - Original file buffer
 * @param {String} filename - Original filename
 * @returns {Buffer} - Optimized buffer
 */
const optimizeFile = async (buffer, filename) => {
  // For now, just return the original buffer
  // In a production environment, you would implement image optimization here
  // using libraries like sharp for images, or other optimizations for different file types
  return buffer;
};

/**
 * Uploads a file to the SFTP server with progress tracking
 * @param {Buffer} buffer - File content as buffer
 * @param {String} remotePath - Destination path on server
 * @param {Function} onProgress - Optional progress callback
 */
export async function uploadFileSFTP(buffer, remotePath, onProgress) {
  const client = new SftpClient();

  // Temporary local file path
  const tempFilePath = path.join(TEMP_DIR, path.basename(remotePath));

  try {
    // Connect to SFTP server
    await client.connect(config);

    // Ensure remote directory exists
    const remoteDir = remotePath.substring(0, remotePath.lastIndexOf("/"));
    const exists = await client.exists(remoteDir);
    if (!exists) {
      await client.mkdir(remoteDir, true); // recursive = true
    }

    // Optimize the file if possible (like image compression)
    const optimizedBuffer = await optimizeFile(buffer, remotePath);

    // Write to temporary file
    fs.writeFileSync(tempFilePath, optimizedBuffer);

    // Calculate total size
    const totalSize = optimizedBuffer.length;

    // Upload with progress tracking
    if (typeof onProgress === "function") {
      let uploadedSize = 0;

      // Upload with progress tracking
      await client.fastPut(tempFilePath, remotePath, {
        step: (total, chunk, total2) => {
          uploadedSize += chunk;
          const progress = Math.min(
            100,
            Math.round((uploadedSize / totalSize) * 100)
          );
          onProgress(progress);
        },
      });
    } else {
      // Standard upload without progress tracking
      await client.fastPut(tempFilePath, remotePath);
    }

    // Set appropriate permissions
    await client.chmod(remotePath, 0o644);
  } catch (err) {
    console.error("SFTP upload xatosi:", err.message);
    throw err;
  } finally {
    try {
      // Clean up temporary file
      if (fs.existsSync(tempFilePath)) {
        fs.unlinkSync(tempFilePath);
      }

      // Close SFTP connection
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
