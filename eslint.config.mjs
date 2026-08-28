import coreWebVitals from "eslint-config-next/core-web-vitals";
import typescript from "eslint-config-next/typescript";

const config = [
  {
    ignores: [
      "node_modules/**",
      ".next/**",
      "data/**",
      "prisma/migrations/**",
      "KIDS_ENGLISH_PLAYER_V2_MOCKUP.html",
    ],
  },
  ...coreWebVitals,
  ...typescript,
];

export default config;
