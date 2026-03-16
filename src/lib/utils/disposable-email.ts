import "server-only";

import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";

let disposableDomainSet: Set<string> | null = null;
let cachedExtraDomains = "";
let cachedFileDomainsSignature = "";

const LOCAL_DISPOSABLE_DOMAINS_PATH = join(
  process.cwd(),
  "config",
  "disposable-email-domains.local.json"
);

function normalizeDomain(domain: string): string {
  return domain.trim().toLowerCase().replace(/^@+/, "").replace(/\.+$/, "");
}

function readLocalDisposableDomains(): string[] {
  if (!existsSync(LOCAL_DISPOSABLE_DOMAINS_PATH)) {
    return [];
  }

  try {
    const raw = readFileSync(LOCAL_DISPOSABLE_DOMAINS_PATH, "utf8");
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed)
      ? parsed.filter((value): value is string => typeof value === "string")
      : [];
  } catch (error) {
    console.error("Failed to read local disposable email domains:", error);
    return [];
  }
}

function addDomains(target: Set<string>, domainsToAdd: Iterable<string>): void {
  for (const domain of domainsToAdd) {
    const normalizedDomain = normalizeDomain(domain);
    if (normalizedDomain) {
      target.add(normalizedDomain);
    }
  }
}

function buildDisposableDomainSet(
  fileDomains: string[],
  extraDomains: string
): Set<string> {
  const domains = new Set<string>();
  addDomains(domains, fileDomains);
  addDomains(domains, extraDomains.split(","));

  return domains;
}

function getDisposableDomainSet(): Set<string> {
  const extraDomains = process.env.BLOCKED_EMAIL_DOMAINS ?? "";
  const fileDomains = readLocalDisposableDomains();
  const fileDomainsSignature = JSON.stringify(fileDomains);

  if (
    !disposableDomainSet ||
    cachedExtraDomains !== extraDomains ||
    cachedFileDomainsSignature !== fileDomainsSignature
  ) {
    disposableDomainSet = buildDisposableDomainSet(fileDomains, extraDomains);
    cachedExtraDomains = extraDomains;
    cachedFileDomainsSignature = fileDomainsSignature;
  }

  return disposableDomainSet;
}

export function getEmailDomain(email: string): string | null {
  const atIndex = email.lastIndexOf("@");

  if (atIndex <= 0 || atIndex === email.length - 1) {
    return null;
  }

  const domain = normalizeDomain(email.slice(atIndex + 1));
  return domain || null;
}

export function isDisposableEmailDomain(domain: string): boolean {
  const normalizedDomain = normalizeDomain(domain);
  if (!normalizedDomain) {
    return false;
  }

  const parts = normalizedDomain.split(".").filter(Boolean);
  const domains = getDisposableDomainSet();

  for (let i = 0; i < parts.length - 1; i++) {
    const candidate = parts.slice(i).join(".");
    if (domains.has(candidate)) {
      return true;
    }
  }

  return false;
}

export function isDisposableEmail(email: string): boolean {
  const domain = getEmailDomain(email);
  return domain ? isDisposableEmailDomain(domain) : false;
}
