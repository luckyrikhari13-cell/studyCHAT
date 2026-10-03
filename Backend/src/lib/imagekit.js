import ImageKit, { toFile } from "@imagekit/nodejs";

// Created lazily (on first upload) so the server can still start
// when IMAGEKIT_PRIVATE_KEY is not set. Text chat keeps working.
let client;

function getClient() {
  client ??= new ImageKit({ privateKey: process.env.IMAGEKIT_PRIVATE_KEY });
  return client;
}

function hasImagekitConfig() {
  return Boolean(process.env.IMAGEKIT_PRIVATE_KEY);
}

// this helper makes a safe unique filename for uploaded files.
function createFileName(originalName = "upload") {
  const safeName = originalName.replace(/[^a-zA-Z0-9._-]/g, "_");
  return `chat-${Date.now()}-${safeName}`;
}

async function uploadChatMedia(file) {
  const fileName = createFileName(file.originalname);

  const result = await getClient().files.upload({
    file: await toFile(file.buffer, fileName, { type: file.mimetype }),
    fileName,
    folder: "/chat",
  });

  return result.url;
}

export { uploadChatMedia, hasImagekitConfig };

// @see https://imagekit.io/docs/api-reference/upload-file/upload-file
