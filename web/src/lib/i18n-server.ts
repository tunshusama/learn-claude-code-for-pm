import en from "@/i18n/messages/en.json";
import zh from "@/i18n/messages/zh.json";
import ja from "@/i18n/messages/ja.json";
import { DEFAULT_LOCALE, resolveLocale, type Locale } from "@/lib/constants";

type Messages = typeof en;

const messagesMap: Record<Locale, Messages> = { en, zh, ja };
const defaultMessages = messagesMap[DEFAULT_LOCALE];

export function getTranslations(locale: string, namespace: string) {
  const messages = messagesMap[resolveLocale(locale)];
  const ns = (messages as Record<string, Record<string, string>>)[namespace];
  const fallbackNs = (defaultMessages as Record<string, Record<string, string>>)[namespace];
  return (key: string): string => {
    return ns?.[key] || fallbackNs?.[key] || key;
  };
}
