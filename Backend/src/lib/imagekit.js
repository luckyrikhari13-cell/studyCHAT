import ImageKit , { toFile } from "@imagekit/nodejs"

const imagekit = new ImageKit({
    privateKey : process.env.IMAGEKIT_PRIVATE_KEY
});

function hasImagekitConfig(){
    return Boolean(process.env.IMAGEKIT_PRIVATE_KEY);
}


// this helper makes a safe unique filename for uploaded files.

function createFileName(originalName="upload"){
    const safeName = originalName.replace(/[^a-zA-Z0-9._-]/g, "_");
    return `chat-${Date.now()}-${safeName}`
}

async function uploadChatMedia(file){
    const fileName = createFileName(file.originalname);

    const result = await imagekit.files.upload({
        file : await toFile(file.buffer , fileName , {type : file.mimetype}),
        fileName,
        folder:"/chat",
    })

    return result.url;
}

export {uploadChatMedia , hasImagekitConfig};


// read this imagekit documentation for future understanding or current understanding
// @see https://imagekit.io/docs/api-reference/upload-file/upload-file