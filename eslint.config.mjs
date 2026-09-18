import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
    "public/**",
  ]),
  {
    rules: {
      // Bu kural, fetch-then-setState (mount'ta veri çekme) gibi standart async
      // efektleri de "senkron setState" sayıp hatalı şekilde işaretliyor -
      // setState çağrıları burada .then()/await sonrası, yani gerçekten senkron değil.
      "react-hooks/set-state-in-effect": "off",
    },
  },
]);

export default eslintConfig;
