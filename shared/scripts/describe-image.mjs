/**
 * Describe an image using the Claude vision API.
 *
 * Usage:
 *   node shared/scripts/describe-image.mjs <path-to-image>
 *
 * Environment:
 *   ANTHROPIC_API_KEY - Required
 */

import Anthropic from "@anthropic-ai/sdk";
import fs from "node:fs";
import path from "node:path";

const SUPPORTED_TYPES = {
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".png": "image/png",
  ".gif": "image/gif",
  ".webp": "image/webp",
};

const imagePath = process.argv[2];

if (!imagePath) {
  console.error("Usage: node shared/scripts/describe-image.mjs <path-to-image>");
  process.exit(1);
}

const ext = path.extname(imagePath).toLowerCase();
const mediaType = SUPPORTED_TYPES[ext];

if (!mediaType) {
  console.error(`Unsupported file type "${ext}". Supported: ${Object.keys(SUPPORTED_TYPES).join(", ")}`);
  process.exit(1);
}

if (!fs.existsSync(imagePath)) {
  console.error(`File not found: ${imagePath}`);
  process.exit(1);
}

const imageData = fs.readFileSync(imagePath).toString("base64");

const client = new Anthropic();

const response = await client.messages.create({
  model: "claude-opus-4-7",
  max_tokens: 1024,
  messages: [
    {
      role: "user",
      content: [
        {
          type: "image",
          source: {
            type: "base64",
            media_type: mediaType,
            data: imageData,
          },
        },
        {
          type: "text",
          text: "Describe this image in detail.",
        },
      ],
    },
  ],
});

for (const block of response.content) {
  if (block.type === "text") {
    console.log(block.text);
  }
}
