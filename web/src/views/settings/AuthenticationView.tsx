import { useCallback, useEffect, useState } from "react";
import ActivityIndicator from "@/components/indicators/activity-indicator";
import { FrigateConfig } from "@/types/frigateConfig";
import { Toaster } from "@/components/ui/sonner";
import useSWR from "swr";
import Heading from "@/components/ui/heading";
import { User } from "@/types/user";
import { Button } from "@/components/ui/button";
import SetPasswordDialog from "@/components/overlay/SetPasswordDialog";
import axios from "axios";
import CreateUserDialog from "@/components/overlay/CreateUserDialog";
import { toast } from "sonner";
import DeleteUserDialog from "@/components/overlay/DeleteUserDialog";
import { HiTrash } from "react-icons/hi";
import { FaUserEdit } from "react-icons/fa";

import { LuPlus, LuShield, LuUserCog } from "react-icons/lu";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import RoleChangeDialog from "@/components/overlay/RoleChangeDialog";
import { useTranslation } from "react-i18next";

export default function AuthenticationView() {
  const { t } = useTranslation("views/settings");
  const { data: config } = useSWR<FrigateConfig>("config");
  const { data: users, mutate: mutateUsers } = useSWR<User[]>("users");

  const [showSetPassword, setShowSetPassword] = useState(false);
  const [showCreate, setShowCreate] = useState(false);
  const [showDelete, setShowDelete] = useState(false);
  const [showRoleChange, setShowRoleChange] = useState(false);

  const [selectedUser, setSelectedUser] = useState<string>();
  const [selectedUserRole, setSelectedUserRole] = useState<
    "admin" | "viewer"
  >();

  useEffect(() => {
    document.title = t("documentTitle.authentication");
  }, [t]);

  const onSavePassword = useCallback(
    (user: string, password: string) => {
      axios
        .put(`users/${user}/password`, { password })
        .then((response) => {
          if (response.status === 200) {
            setShowSetPassword(false);
            toast.success(t("users.toast.success.updatePassword"), {
              position: "top-center",
            });
          }
        })
        .catch((error) => {
          const errorMessage =
            error.response?.data?.message ||
            error.response?.data?.detail ||
            "Unknown error";
          toast.error(
            t("users.toast.error.setPasswordFailed", {
              errorMessage,
            }),
            {
              position: "top-center",
            },
          );
        });
    },
    [t],
  );

  const onCreate = (
    user: string,
    password: string,
    role: "admin" | "viewer",
  ) => {
    axios
      .post("users", { username: user, password, role })
      .then((response) => {
        if (response.status === 200 || response.status === 201) {
          setShowCreate(false);
          mutateUsers((users) => {
            users?.push({ username: user, role: role });
            return users;
          }, false);
          toast.success(t("users.toast.success.createUser", { user }), {
            position: "top-center",
          });
        }
      })
      .catch((error) => {
        const errorMessage =
          error.response?.data?.message ||
          error.response?.data?.detail ||
          "Unknown error";
        toast.error(
          t("users.toast.error.createUserFailed", {
            errorMessage,
          }),
          {
            position: "top-center",
          },
        );
      });
  };

  const onDelete = (user: string) => {
    axios
      .delete(`users/${user}`)
      .then((response) => {
        if (response.status === 200) {
          setShowDelete(false);
          mutateUsers(
            (users) => users?.filter((u) => u.username !== user),
            false,
          );
          toast.success(t("users.toast.success.deleteUser", { user }), {
            position: "top-center",
          });
        }
      })
      .catch((error) => {
        const errorMessage =
          error.response?.data?.message ||
          error.response?.data?.detail ||
          "Unknown error";
        toast.error(
          t("users.toast.error.deleteUserFailed", {
            errorMessage,
          }),
          {
            position: "top-center",
          },
        );
      });
  };

  const onChangeRole = (user: string, newRole: "admin" | "viewer") => {
    if (user === "admin") return; // Prevent role change for 'admin'

    axios
      .put(`users/${user}/role`, { role: newRole })
      .then((response) => {
        if (response.status === 200) {
          setShowRoleChange(false);
          mutateUsers(
            (users) =>
              users?.map((u) =>
                u.username === user ? { ...u, role: newRole } : u,
              ),
            false,
          );
          toast.success(t("users.toast.success.roleUpdated", { user }), {
            position: "top-center",
          });
        }
      })
      .catch((error) => {
        const errorMessage =
          error.response?.data?.message ||
          error.response?.data?.detail ||
          "Unknown error";
        toast.error(
          t("users.toast.error.roleUpdateFailed", {
            errorMessage,
          }),
          {
            position: "top-center",
          },
        );
      });
  };

  if (!config || !users) {
    return (
      <div className="flex h-full w-full items-center justify-center">
        <ActivityIndicator />
      </div>
    );
  }

  return (
    <div className="flex size-full flex-col md:flex-row">
      <Toaster position="top-center" closeButton={true} />
      <div className="scrollbar-container order-last mb-10 mt-2 flex h-full w-full flex-col overflow-y-auto rounded-lg border-[1px] border-secondary-foreground bg-background_alt p-2 md:order-none md:mb-0 md:mr-2 md:mt-0">
        <div className="mb-5 flex flex-row items-center justify-between gap-2">
          <div className="flex flex-col items-start">
            <Heading as="h3" className="my-2">
              {t("users.management.title")}
            </Heading>
            <p className="text-sm text-muted-foreground">
              {t("users.management.desc")}
            </p>
          </div>
          <Button
            className="flex items-center gap-2 self-start sm:self-auto"
            aria-label={t("users.addUser")}
            variant="default"
            onClick={() => setShowCreate(true)}
          >
            <LuPlus className="size-4" />
            {t("users.addUser")}
          </Button>
        </div>
        <div className="mb-6 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div className="scrollbar-container flex-1 overflow-hidden rounded-lg border border-border bg-background_alt">
            <div className="h-full overflow-auto">
              <Table>
                <TableHeader className="sticky top-0 bg-muted/50">
                  <TableRow>
                    <TableHead className="w-[250px]">
                      {t("users.table.username")}
                    </TableHead>
                    <TableHead>{t("users.table.role")}</TableHead>
                    <TableHead className="text-right">
                      {t("users.table.actions")}
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {users.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={3} className="h-24 text-center">
                        {t("users.table.noUsers")}
                      </TableCell>
                    </TableRow>
                  ) : (
                    users.map((user) => (
                      <TableRow key={user.username} className="group">
                        <TableCell className="font-medium">
                          <div className="flex items-center gap-2">
                            {user.username === "admin" ? (
                              <LuShield className="size-4 text-primary" />
                            ) : (
                              <LuUserCog className="size-4 text-primary-variant" />
                            )}
                            {user.username}
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge
                            variant={
                              user.role === "admin" ? "default" : "outline"
                            }
                            className={
                              user.role === "admin"
                                ? "bg-primary/20 text-primary hover:bg-primary/30"
                                : ""
                            }
                          >
                            {t("role." + (user.role || "viewer"), {
                              ns: "common",
                            })}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          <TooltipProvider>
                            <div className="flex items-center justify-end gap-2">
                              {user.username !== "admin" && (
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <Button
                                      size="sm"
                                      variant="outline"
                                      className="h-8 px-2"
                                      onClick={() => {
                                        setSelectedUser(user.username);
                                        setSelectedUserRole(
                                          (user.role as "admin" | "viewer") ||
                                            "viewer",
                                        );
                                        setShowRoleChange(true);
                                      }}
                                    >
                                      <LuUserCog className="size-3.5" />
                                      <span className="ml-1.5 hidden sm:inline-block">
                                        {t("role.title", { ns: "common" })}
                                      </span>
                                    </Button>
                                  </TooltipTrigger>
                                  <TooltipContent>
                                    <p>{t("users.table.changeRole")}</p>
                                  </TooltipContent>
                                </Tooltip>
                              )}

                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    className="h-8 px-2"
                                    onClick={() => {
                                      setShowSetPassword(true);
                                      setSelectedUser(user.username);
                                    }}
                                  >
                                    <FaUserEdit className="size-3.5" />
                                    <span className="ml-1.5 hidden sm:inline-block">
                                      {t("users.table.password")}
                                    </span>
                                  </Button>
                                </TooltipTrigger>
                                <TooltipContent>
                                  <p>{t("users.updatePassword")}</p>
                                </TooltipContent>
                              </Tooltip>

                              {user.username !== "admin" && (
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <Button
                                      size="sm"
                                      variant="destructive"
                                      className="h-8 px-2"
                                      onClick={() => {
                                        setShowDelete(true);
                                        setSelectedUser(user.username);
                                      }}
                                    >
                                      <HiTrash className="size-3.5" />
                                      <span className="ml-1.5 hidden sm:inline-block">
                                        {t("button.delete", { ns: "common" })}
                                      </span>
                                    </Button>
                                  </TooltipTrigger>
                                  <TooltipContent>
                                    <p>{t("users.table.deleteUser")}</p>
                                  </TooltipContent>
                                </Tooltip>
                              )}
                            </div>
                          </TooltipProvider>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          </div>
        </div>
      </div>

      <SetPasswordDialog
        show={showSetPassword}
        onCancel={() => setShowSetPassword(false)}
        onSave={(password) => onSavePassword(selectedUser!, password)}
      />
      <DeleteUserDialog
        show={showDelete}
        username={selectedUser ?? "this user"}
        onCancel={() => setShowDelete(false)}
        onDelete={() => onDelete(selectedUser!)}
      />
      <CreateUserDialog
        show={showCreate}
        onCreate={onCreate}
        onCancel={() => setShowCreate(false)}
      />
      {selectedUser && selectedUserRole && (
        <RoleChangeDialog
          show={showRoleChange}
          username={selectedUser}
          currentRole={selectedUserRole}
          onSave={(role) => onChangeRole(selectedUser, role)}
          onCancel={() => setShowRoleChange(false)}
        />
      )}
    </div>
  );
}
