import mongoose from "mongoose";
import { config } from "dotenv";
import videoModel from "../model/video.model.js";

config();

// Migration script to convert old video format to new format
async function migrateVideos() {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log("✅ Database connected");

    const videos = await videoModel.find();
    console.log(`Found ${videos.length} videos to check`);

    let migrated = 0;
    let skipped = 0;

    for (const video of videos) {
      // Check if video is in old format (has iframe, player, hls, thumbnail, mp4)
      if (
        video.video &&
        (video.video.iframe ||
          video.video.player ||
          video.video.hls ||
          video.video.thumbnail ||
          video.video.mp4)
      ) {
        // Old format detected - convert to new format
        const oldPlayer = video.video.player || video.video.mp4 || "";

        await videoModel.findByIdAndUpdate(video._id, {
          video: {
            assets: {
              player: oldPlayer,
            },
          },
        });

        migrated++;
        console.log(`✅ Migrated video: ${video.title} (${video._id})`);
      } else if (video.video && video.video.assets && video.video.assets.player) {
        // Already in new format
        skipped++;
      } else {
        console.warn(`⚠️  Video ${video.title} (${video._id}) has unknown format`);
      }
    }

    console.log(`\n✅ Migration complete!`);
    console.log(`   Migrated: ${migrated}`);
    console.log(`   Skipped (already new format): ${skipped}`);
    console.log(`   Total: ${videos.length}`);

    await mongoose.disconnect();
    console.log("✅ Database disconnected");
  } catch (error) {
    console.error("❌ Migration failed:", error);
    await mongoose.disconnect();
    process.exit(1);
  }
}

migrateVideos();
