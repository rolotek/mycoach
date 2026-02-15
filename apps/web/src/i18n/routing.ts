import { defineRouting } from "next-intl/routing";

export const routing = defineRouting({
  locales: ["en", "fr-FR", "it", "ja", "zh-CN", "en-GB"],
  defaultLocale: "en",
  localePrefix: "always",
});
