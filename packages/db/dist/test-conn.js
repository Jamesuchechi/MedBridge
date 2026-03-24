"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const index_1 = require("./index");
async function testConnection() {
    try {
        console.log("Testing connection...");
        const result = await index_1.db.select().from(index_1.users).limit(1);
        console.log("Connection successful, found user count:", result.length);
        process.exit(0);
    }
    catch (err) {
        console.error("Connection failed:", err);
        process.exit(1);
    }
}
testConnection();
