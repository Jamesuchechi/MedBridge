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
const dotenv = __importStar(require("dotenv"));
const path_1 = __importDefault(require("path"));
dotenv.config({ path: path_1.default.resolve(__dirname, "../../../.env") });
const supabase_1 = require("../config/supabase");
async function setup() {
    console.log("Setting up Supabase Storage...");
    const { data: buckets, error: listError } = await supabase_1.supabase.storage.listBuckets();
    if (listError) {
        console.error("Error listing buckets:", listError);
        return;
    }
    const bucketName = "medical-documents";
    const exists = buckets.find((b) => b.name === bucketName);
    if (!exists) {
        console.log(`Creating bucket: ${bucketName}...`);
        const { error: createError } = await supabase_1.supabase.storage.createBucket(bucketName, {
            public: true, // Making it public for easy AI access, but should ideally be private with signed URLs
            fileSizeLimit: 10485760, // 10MB
        });
        if (createError) {
            console.error("Error creating bucket:", createError);
        }
        else {
            console.log("Bucket created successfully.");
        }
    }
    else {
        console.log(`Bucket ${bucketName} already exists. Ensuring it is public...`);
        const { error: updateError } = await supabase_1.supabase.storage.updateBucket(bucketName, {
            public: true,
        });
        if (updateError) {
            console.error("Error updating bucket:", updateError);
        }
        else {
            console.log("Bucket updated to public successfully.");
        }
    }
    console.log("Storage setup complete.");
}
setup();
