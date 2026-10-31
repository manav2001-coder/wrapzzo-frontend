import * as React from "react";
import { ChevronDown, ChevronRight, Search, Settings2 } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import type { Template } from "@/types/tbac";

import { IconButton } from "@/components/icon-button";
import { PermissionGate } from "@/components/access-control/permission-gate";
import { SectionCard } from "@/components/section-card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useCompanyScope } from "@/components/masters/company-scope-select";
import { MasterPageHeader, StatusCell } from "@/components/masters/master-page";
import { TemplateQuickAddRow } from "@/components/tbac/template-quick-add-row";
import { useApiErrorToast } from "@/hooks/use-api-error-toast";
import { listAll } from "@/lib/masters-api";

const PATH = "/api/tbac/templates";

/**
 * Features to Template — v4's `/tbac/features-to-template`.
 *
 * A hand-rolled table rather than `DataTable`, as v4 also drops its own `CustomTable` here.
 * Not because the expander is unsupported — `DataTable` has `getRowCanExpand`/`renderSubRow`
 * — but because this screen holds its rows in local state so the quick-add strip can patch
 * one row's count in place, while `DataTable` owns fetching and paging through `fetchData`.
 * Moving to it means giving that write-back a home in the table's own API.
 *
 * The effective (direct + inherited) count rides along on the list response — the API walks
 * the composition graph once for the whole page. `counts` then holds only the rows the
 * quick-add strip has changed since, so the badge can move without collapsing the row.
 */
export default function FeaturesToTemplatePage() {
  const { t } = useTranslation(["tbac", "common"]);
  const navigate = useNavigate();
  const showError = useApiErrorToast();
  const scope = useCompanyScope();

  const [templates, setTemplates] = React.useState<Template[]>([]);
  const [counts, setCounts] = React.useState<Record<string, number>>({});
  const [loading, setLoading] = React.useState(true);
  const [expanded, setExpanded] = React.useState<string | null>(null);
  const [search, setSearch] = React.useState("");

  const load = React.useCallback(async () => {
    setLoading(true);
    try {
      const rows = await listAll<Template>(
        PATH,
        scope.companyId ? { companyId: scope.companyId } : {},
      );
      setTemplates(rows.filter((row) => row.active));
      // The list is authoritative again, so drop any counts the quick-add strip had patched in.
      setCounts({});
    } catch (error) {
      showError(error);
    } finally {
      setLoading(false);
    }
  }, [scope.companyId, showError]);

  React.useEffect(() => {
    void load();
  }, [load]);

  // Stable identity: the quick-add row reports its count through this on every load, and an
  // inline arrow here would make its effect re-fire on every parent render.
  const handleCountUpdate = React.useCallback((id: string, value: number) => {
    setCounts((prev) => (prev[id] === value ? prev : { ...prev, [id]: value }));
  }, []);

  const filtered = React.useMemo(() => {
    const needle = search.trim().toLowerCase();
    if (!needle) return templates;
    return templates.filter(
      (row) =>
        row.name.toLowerCase().includes(needle) ||
        row.templateKey.toLowerCase().includes(needle) ||
        (row.description?.toLowerCase().includes(needle) ?? false),
    );
  }, [templates, search]);

  const columnCount = 6;

  return (
    <div className="p-6">
      <MasterPageHeader
        title={t("featuresToTemplate.title")}
        description={t("featuresToTemplate.subtitle")}
        extra={scope.control}
      />

      <SectionCard>
        <div className="relative mb-4 max-w-xs">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder={t("action.search", { ns: "common" })}
            className="pl-8"
          />
        </div>

        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-10" />
                <TableHead>{t("templateMaster.fields.name")}</TableHead>
                <TableHead>{t("templateMaster.fields.features")}</TableHead>
                <TableHead>{t("templateMaster.fields.templateKey")}</TableHead>
                <TableHead>{t("field.status", { ns: "common" })}</TableHead>
                {/* Actions last, matching every other table in the app. */}
                <TableHead className="w-24 text-right">
                  {t("field.actions", { ns: "common" })}
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading && (
                <TableRow>
                  <TableCell colSpan={columnCount}>
                    <Skeleton className="h-8 w-full" />
                  </TableCell>
                </TableRow>
              )}

              {!loading &&
                filtered.map((template) => {
                  const open = expanded === template.id;
                  // The quick-add strip's in-place update wins over the list's own count.
                  const count = counts[template.id] ?? template.effectiveFeatureCount ?? 0;
                  return (
                    <React.Fragment key={template.id}>
                      <TableRow>
                        <TableCell>
                          <IconButton
                            icon={open ? ChevronDown : ChevronRight}
                            label={
                              open
                                ? t("featuresToTemplate.collapse")
                                : t("featuresToTemplate.expand")
                            }
                            onClick={() => setExpanded(open ? null : template.id)}
                          />
                        </TableCell>
                        <TableCell className="font-medium">{template.name}</TableCell>
                        <TableCell>
                          <Badge variant={count > 0 ? "default" : "secondary"}>
                            {count > 0
                              ? t("featuresToTemplate.assignedCount", { count })
                              : t("featuresToTemplate.noneAssigned")}
                          </Badge>
                        </TableCell>
                        <TableCell className="font-mono text-xs">{template.templateKey}</TableCell>
                        <TableCell>
                          <StatusCell active={template.active} />
                        </TableCell>
                        <TableCell className="text-right">
                          <PermissionGate permission="tbac.features_to_template.manage">
                            <IconButton
                              icon={Settings2}
                              label={t("featuresToTemplate.manage")}
                              onClick={() => navigate(`/tbac/features-to-template/${template.id}`)}
                            />
                          </PermissionGate>
                        </TableCell>
                      </TableRow>

                      {open && (
                        <TableRow>
                          <TableCell colSpan={columnCount} className="p-0">
                            <PermissionGate permission="tbac.features_to_template.assignment">
                              <TemplateQuickAddRow
                                template={template}
                                onCountUpdate={handleCountUpdate}
                                onFeaturesAssigned={() => {
                                  setExpanded(null);
                                  void load();
                                }}
                              />
                            </PermissionGate>
                          </TableCell>
                        </TableRow>
                      )}
                    </React.Fragment>
                  );
                })}

              {!loading && filtered.length === 0 && (
                <TableRow>
                  <TableCell
                    colSpan={columnCount}
                    className="py-10 text-center text-sm text-muted-foreground"
                  >
                    {t("templateMaster.empty")}
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      </SectionCard>
    </div>
  );
}
