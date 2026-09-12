import { useMemo } from "react";
import type { ComponentType } from "react";
import { useTranslation } from "react-i18next";
import cloneDeep from "lodash/cloneDeep";
import get from "lodash/get";
import set from "lodash/set";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { LuPlus, LuTrash2 } from "react-icons/lu";
import { TagsWidget } from "@/components/config-form/theme/widgets/TagsWidget";
import { isJsonObject } from "@/lib/utils";
import type { ConfigSectionData, JsonObject } from "@/types/configForm";
import type { SectionRendererProps } from "./registry";

const EMPTY_FORM_DATA: JsonObject = {};
const RoleMapTags = TagsWidget as unknown as ComponentType<{
  id: string;
  value: string[];
  onChange: (value: unknown) => void;
  schema: { title: string };
}>;

export default function ProxyRoleMap({ formContext }: SectionRendererProps) {
  const { t } = useTranslation(["views/settings", "config/global"]);

  const fullFormData =
    (formContext?.formData as JsonObject | undefined) ?? EMPTY_FORM_DATA;
  const onFormDataChange = formContext?.onFormDataChange;

  const roleHeader = get(fullFormData, "header_map.role");
  const hasRoleHeader =
    typeof roleHeader === "string" && roleHeader.trim().length > 0;

  const roleMap = useMemo(() => {
    const roleMapValue = get(fullFormData, "header_map.role_map");
    return isJsonObject(roleMapValue)
      ? (roleMapValue as Record<string, string[]>)
      : {};
  }, [fullFormData]);

  const roleOptions = useMemo(() => {
    const rolesFromConfig = formContext?.fullConfig?.auth?.roles
      ? Object.keys(formContext.fullConfig.auth.roles)
      : [];
    const roles =
      rolesFromConfig.length > 0 ? rolesFromConfig : ["admin", "viewer"];

    return Array.from(new Set([...roles, ...Object.keys(roleMap)])).sort();
  }, [formContext?.fullConfig, roleMap]);

  if (!onFormDataChange || !formContext?.formData) {
    return null;
  }

  if (!hasRoleHeader) {
    return null;
  }

  const usedRoles = new Set(Object.keys(roleMap));
  const nextRole = roleOptions.find((role) => !usedRoles.has(role));

  const updateRoleMap = (nextRoleMap: Record<string, string[]>) => {
    const nextFormData = cloneDeep(fullFormData) as JsonObject;
    set(nextFormData, "header_map.role_map", nextRoleMap);
    onFormDataChange(nextFormData as ConfigSectionData);
  };

  const handleAdd = () => {
    if (!nextRole) return;
    updateRoleMap({
      ...roleMap,
      [nextRole]: [],
    });
  };

  const handleRemove = (role: string) => {
    const next = { ...roleMap };
    delete next[role];
    updateRoleMap(next);
  };

  const handleRoleChange = (currentRole: string, newRole: string) => {
    if (currentRole === newRole) return;
    const next = { ...roleMap } as Record<string, string[]>;
    const groups = next[currentRole] ?? [];
    delete next[currentRole];
    next[newRole] = groups;
    updateRoleMap(next);
  };

  const handleGroupsChange = (role: string, groups: unknown) => {
    updateRoleMap({
      ...roleMap,
      [role]: Array.isArray(groups) ? groups : [],
    });
  };

  const roleMapLabel = t("proxy.header_map.role_map.label", {
    ns: "config/global",
  });
  const roleMapDescription = t("proxy.header_map.role_map.description", {
    ns: "config/global",
  });

  return (
    <div className="space-y-4">
      <div className="space-y-1">
        <Label className="text-sm font-medium">{roleMapLabel}</Label>
        <p className="text-xs text-muted-foreground">{roleMapDescription}</p>
      </div>

      {Object.keys(roleMap).length === 0 && (
        <p className="text-sm italic text-muted-foreground">
          {t("configForm.roleMap.empty", { ns: "views/settings" })}
        </p>
      )}

      {Object.entries(roleMap).map(([role, groups], index) => {
        const rowId = `role-map-${role}-${index}`;
        const roleLabel = t("configForm.roleMap.roleLabel", {
          ns: "views/settings",
        });
        const groupsLabel = t("configForm.roleMap.groupsLabel", {
          ns: "views/settings",
        });
        const normalizedGroups = Array.isArray(groups) ? groups : [];

        return (
          <div key={rowId} className="grid grid-cols-12 items-start gap-2">
            <div className="col-span-12 space-y-2 md:col-span-4">
              <Label htmlFor={`${rowId}-role`}>{roleLabel}</Label>
              <Select
                value={role}
                onValueChange={(next) => handleRoleChange(role, next)}
              >
                <SelectTrigger id={`${rowId}-role`} className="w-full">
                  <SelectValue placeholder={roleLabel} />
                </SelectTrigger>
                <SelectContent>
                  {roleOptions.map((option) => (
                    <SelectItem key={option} value={option}>
                      {option}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="col-span-12 space-y-2 md:col-span-7">
              <Label htmlFor={`${rowId}-groups`}>{groupsLabel}</Label>
              <RoleMapTags
                id={`${rowId}-groups`}
                value={normalizedGroups}
                onChange={(next) => handleGroupsChange(role, next)}
                schema={{ title: groupsLabel }}
              />
            </div>

            <div className="col-span-12 flex items-center md:col-span-1 md:justify-center md:pt-7">
              <Button
                type="button"
                variant="ghost"
                size="icon"
                onClick={() => handleRemove(role)}
                aria-label={t("configForm.roleMap.remove", {
                  ns: "views/settings",
                })}
                title={t("configForm.roleMap.remove", {
                  ns: "views/settings",
                })}
              >
                <LuTrash2 className="h-4 w-4" />
              </Button>
            </div>
          </div>
        );
      })}

      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={handleAdd}
        disabled={!nextRole}
        className="gap-2"
      >
        <LuPlus className="h-4 w-4" />
        {t("configForm.roleMap.addMapping", {
          ns: "views/settings",
        })}
      </Button>
    </div>
  );
}
