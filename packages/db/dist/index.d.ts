import postgres from "postgres";
import * as schema from "./medbridge-schema";
export declare const db: import("drizzle-orm/postgres-js").PostgresJsDatabase<typeof schema> & {
    $client: postgres.Sql<{}>;
};
export * from "./medbridge-schema";
