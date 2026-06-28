import zh from "@/i18n/messages/zh.json";
import { DEFAULT_LOCALE, VERSION_META } from "@/lib/constants";

type VersionText = {
  title: string;
  subtitle: string;
  coreAddition: string;
  keyInsight: string;
};

const zhMessages = zh as typeof zh & {
  version_meta?: Record<string, Partial<VersionText>>;
};

export function getVersionDisplay(versionId: string, locale: string) {
  const meta = VERSION_META[versionId];
  const localized =
    locale === DEFAULT_LOCALE ? zhMessages.version_meta?.[versionId] : undefined;

  return {
    ...meta,
    title: localized?.title ?? meta?.title ?? versionId,
    subtitle: localized?.subtitle ?? meta?.subtitle ?? "",
    coreAddition: localized?.coreAddition ?? meta?.coreAddition ?? "",
    keyInsight: localized?.keyInsight ?? meta?.keyInsight ?? "",
  };
}

export function getLocaleMessage(
  locale: string,
  namespace: string,
  key: string,
  fallback: string
) {
  if (locale !== DEFAULT_LOCALE) return fallback;

  const namespaceMessages = (zhMessages as unknown as Record<string, unknown>)[
    namespace
  ];
  if (!namespaceMessages || typeof namespaceMessages !== "object") {
    return fallback;
  }

  const message = (namespaceMessages as Record<string, unknown>)[key];
  return typeof message === "string" ? message : fallback;
}

export function formatLocaleMessage(
  locale: string,
  namespace: string,
  key: string,
  fallback: string,
  values: Record<string, string>
) {
  let message = getLocaleMessage(locale, namespace, key, fallback);

  for (const [name, value] of Object.entries(values)) {
    message = message.replaceAll(`{${name}}`, value);
  }

  return message;
}
