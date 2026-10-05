import { config } from "@remotion/eslint-config-flat";

// Die Datenskripte (src/<video>/daten.mjs) laufen in Node, nicht im Video
export default [...config, { files: ["src/**/*.mjs"], languageOptions: { globals: { URL: "readonly", console: "readonly" } } }];
