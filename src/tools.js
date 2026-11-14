import { z } from "zod";

import {
  tiktokPost,
  getCreatorInfo,
  getPublishStatus,
  validateVideoUrl
} from "./tiktok.js";

const PRIVACY_OPTIONS = [
  "PUBLIC_TO_EVERYONE",
  "MUTUAL_FOLLOW_FRIENDS",
  "FOLLOWER_OF_CREATOR",
  "SELF_ONLY"
];

const postSchema = z.object({
  title: z.string().max(2200),
  privacy_level: z.enum(PRIVACY_OPTIONS),
  cover_timestamp_ms: z.number().int().min(0),
  video_url: z.string().url(),
  is_ai_generated: z.boolean().optional()
});

export function registerTikTokTools(server, env) {

  // TOOL 1: Creator information
  server.registerTool(
    "tiktok_get_creator_info",
    {
      description:
        "Get TikTok creator profile information, " +
        "available privacy options and posting restrictions."
    },
    async () => {
      try {
        const info = await getCreatorInfo(env);

        return {
          content: [{
            type: "text",
            text: JSON.stringify(info, null, 2)
          }]
        };
      } catch (error) {
        return {
          isError: true,
          content: [{
            type: "text",
            text: error.message
          }]
        };
      }
    }
  );

  // TOOL 2: Prepare post metadata
  server.registerTool(
    "tiktok_prepare_post",
    {
      description:
        "Prepare TikTok video metadata without publishing anything.",
      inputSchema: postSchema
    },
    async (args) => {
      try {
        const data = postSchema.parse(args);

        validateVideoUrl(env, data.video_url);

        const creator = await getCreatorInfo(env);

        if (!creator.privacy_level_options.includes(
          data.privacy_level
        )) {
          throw new Error(
            "Privacy level tidak tersedia untuk akun ini."
          );
        }

        return {
          content: [{
            type: "text",
            text: JSON.stringify({
              ready: true,
              caption: data.title,
              visibility: data.privacy_level,
              cover_timestamp_ms: data.cover_timestamp_ms,
              cover_timestamp_seconds:
                data.cover_timestamp_ms / 1000,
              video_url: data.video_url,
              is_ai_generated:
                data.is_ai_generated ?? false,
              message:
                "Metadata siap. Belum ada video yang dipublikasikan."
            }, null, 2)
          }]
        };
      } catch (error) {
        return {
          isError: true,
          content: [{
            type: "text",
            text: error.message
          }]
        };
      }
    }
  );

  // TOOL 3: Publish video
  server.registerTool(
    "tiktok_publish_video",
    {
      description:
        "Publish a TikTok video using approved metadata. " +
        "Requires explicit user confirmation.",
      inputSchema: postSchema.extend({
        confirm_publish: z.literal(true)
      })
    },
    async (args) => {
      try {
        const data = postSchema.extend({
          confirm_publish: z.literal(true)
        }).parse(args);

        const videoUrl = validateVideoUrl(
          env,
          data.video_url
        );

        // Fetch current creator restrictions
        const creator = await getCreatorInfo(env);

        if (!creator.privacy_level_options.includes(
          data.privacy_level
        )) {
          throw new Error(
            "Privacy level tidak diizinkan oleh TikTok."
          );
        }

        // Initialize Direct Post
        const result = await tiktokPost(
          env,
          "/post/publish/video/init/",
          {
            post_info: {
              title: data.title,
              privacy_level: data.privacy_level,
              video_cover_timestamp_ms:
                data.cover_timestamp_ms,
              disable_comment: false,
              disable_duet: false,
              disable_stitch: false,
              is_aigc: data.is_ai_generated ?? false
            },
            source_info: {
              source: "PULL_FROM_URL",
              video_url: videoUrl
            }
          }
        );

        return {
          content: [{
            type: "text",
            text: JSON.stringify({
              success: true,
              publish_id: result.publish_id,
              message:
                "TikTok menerima permintaan Direct Post. " +
                "Periksa status publikasi untuk hasil akhirnya."
            }, null, 2)
          }]
        };

      } catch (error) {
        return {
          isError: true,
          content: [{
            type: "text",
            text: error.message
          }]
        };
      }
    }
  );

  // TOOL 4: Check publish status
  server.registerTool(
    "tiktok_get_publish_status",
    {
      description:
        "Check the processing and publishing status of a TikTok video.",
      inputSchema: z.object({
        publish_id: z.string().min(1).max(64)
      })
    },
    async ({ publish_id }) => {
      try {
        const status = await getPublishStatus(
          env,
          publish_id
        );

        return {
          content: [{
            type: "text",
            text: JSON.stringify(status, null, 2)
          }]
        };

      } catch (error) {
        return {
          isError: true,
          content: [{
            type: "text",
            text: error.message
          }]
        };
      }
    }
  );
}
