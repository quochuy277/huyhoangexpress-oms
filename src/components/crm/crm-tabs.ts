export const CRM_TABS = ["shops", "prospects"] as const;

export type CrmTabKey = (typeof CRM_TABS)[number];

export const DEFAULT_CRM_TAB: CrmTabKey = "shops";

export function getCrmTab(value: string | null | undefined): CrmTabKey {
  return CRM_TABS.includes(value as CrmTabKey) ? (value as CrmTabKey) : DEFAULT_CRM_TAB;
}

export function buildCrmTabHref(pathname: string, search: string, tab: CrmTabKey) {
  const params = new URLSearchParams(search);
  params.set("tab", tab);
  const query = params.toString();
  return query ? `${pathname}?${query}` : pathname;
}
