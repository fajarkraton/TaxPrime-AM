"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.optimizeAssetImage = void 0;
const functions = __importStar(require("firebase-functions/v2"));
const admin = __importStar(require("firebase-admin"));
const path = __importStar(require("path"));
const os = __importStar(require("os"));
const fs = __importStar(require("fs"));
const sharp_1 = __importDefault(require("sharp"));
exports.optimizeAssetImage = functions.storage.onObjectFinalized(async (event) => {
    const fileBucket = event.data.bucket;
    const filePath = event.data.name;
    const contentType = event.data.contentType;
    // Exit if not an image or if it's already a thumbnail to prevent infinite loops
    if (!contentType?.startsWith('image/') || filePath.includes('_thumb')) {
        return;
    }
    const fileName = path.basename(filePath);
    const bucket = admin.storage().bucket(fileBucket);
    const tempFilePath = path.join(os.tmpdir(), fileName);
    const thumbFileName = `${path.parse(fileName).name}_thumb.jpg`;
    const tempThumbPath = path.join(os.tmpdir(), thumbFileName);
    const thumbFilePath = path.join(path.dirname(filePath), thumbFileName);
    try {
        // Automatically download the original file to a temp directory
        await bucket.file(filePath).download({ destination: tempFilePath });
        // Resize and optimize image using Sharp to 1080x1080 JPEG
        await (0, sharp_1.default)(tempFilePath)
            .resize(1080, 1080, { fit: 'inside', withoutEnlargement: true })
            .jpeg({ quality: 80 })
            .toFile(tempThumbPath);
        // Upload the resized thumbnail
        await bucket.upload(tempThumbPath, {
            destination: thumbFilePath,
            metadata: { contentType: 'image/jpeg' },
        });
        // Optionally, delete the original oversized file to save space
        // await bucket.file(filePath).delete();
        // Clean up temporary files
        fs.unlinkSync(tempFilePath);
        fs.unlinkSync(tempThumbPath);
        console.log(`Successfully generated thumbnail: ${thumbFilePath}`);
    }
    catch (error) {
        console.error('Image optimization failed:', error);
    }
});
//# sourceMappingURL=on-image-upload.js.map