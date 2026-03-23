"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
require("dotenv/config");
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
        console.log(`Bucket ${bucketName} already exists.`);
    }
    console.log("Storage setup complete.");
}
setup();
