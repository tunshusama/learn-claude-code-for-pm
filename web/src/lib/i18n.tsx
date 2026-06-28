"use client";
import { createContext, useContext, ReactNode } from "react";
import en from "@/i18n/messages/en.json";
import zh from "@/i18n/messages/zh.json";
import ja from "@/i18n/messages/ja.json";
import { DEFAULT_LOCALE, resolveLocale, type Locale } from "@/lib/constants";

type Messages = typeof en;

const messagesMap: Record<Locale, Messages> = { en, zh, ja };
const defaultMessages = messagesMap[DEFAULT_LOCALE];

const I18nContext = createContext<{ locale: string; messages: Messages }>({
  locale: DEFAULT_LOCALE,
  messages: defaultMessages,
});

export function I18nProvider({ locale, children }: { locale: string; children: ReactNode }) {
  const activeLocale = resolveLocale(locale);
  const messages = messagesMap[activeLocale];
  return (
    <I18nContext.Provider value={{ locale: activeLocale, messages }}>
      {children}
    </I18nContext.Provider>
  );
}

export function useTranslations(namespace?: string) {
  const { messages } = useContext(I18nContext);
  return (key: string) => {
    const ns = namespace ? (messages as any)[namespace] : messages;
    const fallbackNs = namespace ? (defaultMessages as any)[namespace] : defaultMessages;
    return (ns as any)?.[key] || (fallbackNs as any)?.[key] || key;
  };
}

export function useLocale() {
  return useContext(I18nContext).locale;
}
