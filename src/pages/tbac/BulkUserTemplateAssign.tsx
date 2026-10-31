import * as React from "react";
import { ArrowLeft, CheckCircle2, ChevronDown, XCircle } from "lucide-react";
import { useLocation, useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import type { BulkAssignUserTemplatesResult, Template } from "@/types/tbac";

import { AppDialog } from "@/components/app-dialog";
import { PermissionButton } from "@/components/access-control/permission-button";
import { EmptyState } from "@/components/empty-state";
import { SectionCard } from "@/components/section-card";
import { StatCard } from "@/components/stat-card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { MasterPageHeader } from "@/components/masters/master-page";
import { TransferList, type TransferItem } from "@/components/tbac/transfer-list";
import { usePermissions } from "@/hooks/use-permission";
import { useApiErrorToast } from "@/hooks/use-api-error-toast";
import { createResource, listAll } from "@/lib/masters-api";

interface SelectedUser {
  id: string;
  name: string;
  email: string;
}

/**
 * Assign templates to many users at once — v4's `/tbac/assignments/users/bulk-assign`.
 *
 * The selection arrives through router navigation state, put there by the user list. v4 uses
 * `sessionStorage`; navigation state is the better fit because it dies with the navigation,
 * so a bookmark or a reload cannot act on a selection made days ago — it lands on the empty
 * state below instead.
 *
 * The assignment is ADDITIVE per user, and the results dialog distinguishes "added" from
 * "already had it". That distinction is the whole reason to show results at all: without it,
 * a run over 40 users reporting "12 created" looks like 28 failures.
 */
export default function BulkUserTemplateAssignPage() {
  const { t } = useTranslation(["tbac", "common", "masters"]);
  const navigate = useNavigate();
  const location = useLocation();
  const showError = useApiErrorToast();
  const { refetchPermissions } = usePermissions();

  const users = React.useMemo<SelectedUser[]>(
    () => (location.state as { users?: SelectedUser[] } | null)?.users ?? [],
    [location.state],
  );

  const [templates, setTemplates] = React.useState<Template[]>([]);
  const [selectedIds, setSelectedIds] = React.useState<string[]>([]);
  const [search, setSearch] = React.useState("");
  const [submitting, setSubmitting] = React.useState(false);
  const [result, setResult] = React.useState<BulkAssignUserTemplatesResult | null>(null);

  React.useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const rows = await listAll<Template>("/api/tbac/templates");
        if (!cancelled) setTemplates(rows.filter((row) => row.active));
      } catch (error) {
        showError(error);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [showError]);

  const toItem = (template: Template): TransferItem => ({
    id: template.id,
    label: template.name,
    hint: template.description ?? template.templateKey,
  });

  // Client-side filtering here, unlike the feature screen: a tenant has tens of templates,
  // not hundreds, and they are already all loaded for the "selected" side to render.
  const available = React.useMemo(() => {
    const chosen = new Set(selectedIds);
    const needle = search.trim().toLowerCase();
    return templates
      .filter((tpl) => !chosen.has(tpl.id))
      .filter(
        (tpl) =>
          !needle ||
          tpl.name.toLowerCase().includes(needle) ||
          (tpl.description?.toLowerCase().includes(needle) ?? false),
      )
      .map(toItem);
  }, [templates, selectedIds, search]);

  const selected = React.useMemo(
    () => templates.filter((tpl) => selectedIds.includes(tpl.id)).map(toItem),
    [templates, selectedIds],
  );

  async function handleSubmit() {
    if (selectedIds.length === 0) {
      toast.error(t("errors.selectTemplates"));
      return;
    }
    setSubmitting(true);
    try {
      const response = await createResource<BulkAssignUserTemplatesResult>(
        "/api/tbac/users/templates/bulk-assign",
        { userIds: users.map((user) => user.id), templateIds: selectedIds },
      );
      setResult(response);
      await refetchPermissions();
    } catch (error) {
      showError(error);
    } finally {
      setSubmitting(false);
    }
  }

  if (users.length === 0) {
    return (
      <div className="p-6">
        <EmptyState
          title={t("bulkAssign.noUsers")}
          description={t("bulkAssign.noUsersBody")}
          action={{ label: t("action.back", { ns: "common" }), to: "/tbac/assignments/users" }}
        />
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="mb-4">
        <Button variant="ghost" size="sm" onClick={() => navigate("/tbac/assignments/users")}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          {t("action.back", { ns: "common" })}
        </Button>
      </div>

      <MasterPageHeader title={t("bulkAssign.title")} description={t("userTemplates.subtitle")} />

      <SectionCard
        title={
          <span className="text-[12.5px] font-semibold tracking-tight">
            {t("bulkAssign.selectedUsers")}
          </span>
        }
        actions={
          <Badge variant="secondary">
            {t("bulkAssign.usersSelected", { count: users.length })}
          </Badge>
        }
        className="mb-3"
        headerClassName="px-5 py-3"
      >
        <div className="max-h-64 overflow-y-auto rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t("user.fields.name", { ns: "masters" })}</TableHead>
                <TableHead>{t("user.fields.email", { ns: "masters" })}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {users.map((user) => (
                <TableRow key={user.id}>
                  <TableCell className="font-medium">{user.name}</TableCell>
                  <TableCell className="text-muted-foreground">{user.email}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </SectionCard>

      <TransferList
        available={available}
        direct={selected}
        onAdd={(ids) => setSelectedIds((prev) => [...new Set([...prev, ...ids])])}
        onRemove={(ids) => setSelectedIds((prev) => prev.filter((id) => !ids.includes(id)))}
        permission="tbac.bulk_assign_user_templates"
        availableSearch={search}
        onAvailableSearchChange={setSearch}
        labels={{ assigned: t("bulkAssign.title") }}
      />

      <div className="mt-4 flex justify-end gap-2">
        <Button variant="outline" onClick={() => navigate("/tbac/assignments/users")}>
          {t("action.cancel", { ns: "common" })}
        </Button>
        <PermissionButton
          permission="tbac.bulk_assign_user_templates"
          onClick={() => void handleSubmit()}
          disabled={selectedIds.length === 0 || submitting}
        >
          {submitting
            ? t("bulkAssign.submitting")
            : t("bulkAssign.submit", { count: users.length })}
        </PermissionButton>
      </div>

      <AppDialog
        open={result !== null}
        onOpenChange={(open) => {
          if (!open) {
            setResult(null);
            navigate("/tbac/assignments/users");
          }
        }}
        title={t("bulkAssign.resultTitle")}
        size="lg"
        scrollBody
        confirmLabel={t("bulkAssign.done")}
        onConfirm={() => {
          setResult(null);
          navigate("/tbac/assignments/users");
        }}
      >
        {result && (
          <>
            <div className="mb-4 grid gap-3 sm:grid-cols-4">
              <StatCard
                compact
                title={t("bulkAssign.totalUsers")}
                value={result.totalUsersProcessed}
              />
              <StatCard
                compact
                title={t("bulkAssign.successful")}
                value={result.successfulUsers}
                color="success"
              />
              <StatCard
                compact
                title={t("bulkAssign.created")}
                value={result.totalAssignmentsCreated}
                color="primary"
              />
              <StatCard
                compact
                title={t("bulkAssign.skipped")}
                value={result.totalAssignmentsSkipped}
                color="warning"
              />
            </div>

            <p className="mb-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">
              {t("bulkAssign.perUser")}
            </p>
            <div className="space-y-1.5">
              {result.userResults.map((row) => (
                <Collapsible key={row.userId} className="rounded-lg border">
                  <CollapsibleTrigger className="group flex w-full items-center gap-2 px-3 py-2 text-left">
                    {row.status === "success" ? (
                      <CheckCircle2 className="h-4 w-4 shrink-0 text-success" />
                    ) : (
                      <XCircle className="h-4 w-4 shrink-0 text-destructive" />
                    )}
                    <span className="min-w-0 flex-1 truncate text-sm">
                      {row.userName ?? row.userId}
                    </span>
                    <Badge variant="secondary">
                      {t("bulkAssign.userAdded", { count: row.added })}
                    </Badge>
                    <ChevronDown className="h-4 w-4 shrink-0 text-muted-foreground transition-transform group-data-[state=closed]:-rotate-90" />
                  </CollapsibleTrigger>
                  <CollapsibleContent>
                    <div className="space-y-0.5 border-t px-3 py-2 text-xs text-muted-foreground">
                      <p>{t("bulkAssign.userAdded", { count: row.added })}</p>
                      <p>{t("bulkAssign.userSkipped", { count: row.skipped })}</p>
                      {row.error && <p className="text-destructive">{row.error}</p>}
                    </div>
                  </CollapsibleContent>
                </Collapsible>
              ))}
            </div>
          </>
        )}
      </AppDialog>
    </div>
  );
}
