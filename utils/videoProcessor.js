import { exec } from 'child_process';
import { promisify } from 'util';
import path from 'path';
import fs from 'fs';

const execAsync = promisify(exec);

class VideoProcessor {
  
  // Generate video thumbnail
  static async generateThumbnail(videoPath, outputPath, timeOffset = '00:00:01') {
    try {
      const command = `ffmpeg -i "${videoPath}" -ss ${timeOffset} -vframes 1 -q:v 2 -y "${outputPath}"`;
      await execAsync(command);
      return true;
    } catch (error) {
      console.error('Thumbnail generation error:', error);
      return false;
    }
  }

  // Get video metadata
  static async getVideoMetadata(videoPath) {
    try {
      const command = `ffprobe -v quiet -print_format json -show_format -show_streams "${videoPath}"`;
      const { stdout } = await execAsync(command);
      const metadata = JSON.parse(stdout);
      
      const videoStream = metadata.streams.find(stream => stream.codec_type === 'video');
      const audioStream = metadata.streams.find(stream => stream.codec_type === 'audio');
      
      return {
        duration: parseFloat(metadata.format.duration),
        size: parseInt(metadata.format.size),
        bitrate: parseInt(metadata.format.bit_rate),
        video: videoStream ? {
          codec: videoStream.codec_name,
          width: videoStream.width,
          height: videoStream.height,
          fps: eval(videoStream.r_frame_rate),
          bitrate: parseInt(videoStream.bit_rate) || 0
        } : null,
        audio: audioStream ? {
          codec: audioStream.codec_name,
          channels: audioStream.channels,
          sample_rate: parseInt(audioStream.sample_rate),
          bitrate: parseInt(audioStream.bit_rate) || 0
        } : null
      };
    } catch (error) {
      console.error('Metadata extraction error:', error);
      return null;
    }
  }

  // Convert video to multiple formats for better compatibility
  static async processVideo(inputPath, outputDir, filename) {
    try {
      const baseName = path.parse(filename).name;
      const outputs = {
        mp4: path.join(outputDir, `${baseName}.mp4`),
        webm: path.join(outputDir, `${baseName}.webm`),
        hls: path.join(outputDir, `${baseName}.m3u8`)
      };

      // Convert to MP4 (H.264)
      await execAsync(`ffmpeg -i "${inputPath}" -c:v libx264 -c:a aac -movflags +faststart -y "${outputs.mp4}"`);
      
      // Convert to WebM (VP9)
      await execAsync(`ffmpeg -i "${inputPath}" -c:v libvpx-vp9 -c:a libopus -y "${outputs.webm}"`);
      
      // Create HLS playlist for streaming
      await execAsync(`ffmpeg -i "${inputPath}" -c:v libx264 -c:a aac -hls_time 10 -hls_list_size 0 -hls_segment_filename "${outputDir}/${baseName}_%03d.ts" -y "${outputs.hls}"`);

      return outputs;
    } catch (error) {
      console.error('Video processing error:', error);
      return null;
    }
  }

  // Generate multiple thumbnail sizes
  static async generateMultipleThumbnails(videoPath, outputDir, baseName) {
    try {
      const sizes = [
        { name: 'small', width: 320, height: 180 },
        { name: 'medium', width: 640, height: 360 },
        { name: 'large', width: 1280, height: 720 }
      ];

      const thumbnails = {};

      for (const size of sizes) {
        const outputPath = path.join(outputDir, `${baseName}_${size.name}.jpg`);
        const command = `ffmpeg -i "${videoPath}" -ss 00:00:01 -vframes 1 -vf scale=${size.width}:${size.height} -q:v 2 -y "${outputPath}"`;
        await execAsync(command);
        thumbnails[size.name] = outputPath;
      }

      return thumbnails;
    } catch (error) {
      console.error('Multiple thumbnails generation error:', error);
      return null;
    }
  }
}

export default VideoProcessor;