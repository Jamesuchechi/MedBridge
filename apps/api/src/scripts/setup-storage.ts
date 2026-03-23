import * as dotenv from "dotenv";
import path from "path";
dotenv.config({ path: path.resolve(__dirname, "../../../.env") });

import { supabase } from "../config/supabase";

async function setup() {
  console.log("Setting up Supabase Storage...");

  const { data: buckets, error: listError } = await supabase.storage.listBuckets();
  if (listError) {
    console.error("Error listing buckets:", listError);
    return;
  }

  const bucketName = "medical-documents";
  const exists = buckets.find((b) => b.name === bucketName);

  if (!exists) {
    console.log(`Creating bucket: ${bucketName}...`);
    const { error: createError } = await supabase.storage.createBucket(bucketName, {
      public: true, // Making it public for easy AI access, but should ideally be private with signed URLs
      fileSizeLimit: 10485760, // 10MB
    });
    if (createError) {
      console.error("Error creating bucket:", createError);
    } else {
      console.log("Bucket created successfully.");
    }
  } else {
    console.log(`Bucket ${bucketName} already exists. Ensuring it is public...`);
    const { error: updateError } = await supabase.storage.updateBucket(bucketName, {
      public: true,
    });
    if (updateError) {
      console.error("Error updating bucket:", updateError);
    } else {
      console.log("Bucket updated to public successfully.");
    }
  }

  console.log("Storage setup complete.");
}

setup();
