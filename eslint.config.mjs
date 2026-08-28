import coreWebVitals from "eslint-config-next/core-web-vitals";
import typescript from "eslint-config-next/typescript";

const config = [
  {
    ignores: [
      "node_modules/**",
      ".next/**",
      "data/**",
      "prisma/migrations/**",
      "kids-english-player-mockup.html",
    ],
  },
  ...coreWebVitals,
  ...typescript,
];

export default config;
