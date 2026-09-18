import "dotenv/config";
import { defineConfig, env } from "prisma/config";

export default defineConfig({
  // Prisma CLI komutları (migrate, db push vb.) PgBouncer'ı atlayıp doğrudan bağlantı kullanmalı.
  datasource: {
    url: env("DIRECT_URL"),
  },
});
