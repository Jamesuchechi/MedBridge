import dotenv from "dotenv";
import path from "path";

// Load environment variables from the root .env file
dotenv.config({ path: path.join(__dirname, "../../../.env") });

console.log("[ENV]: Environment variables loaded from root .env");
