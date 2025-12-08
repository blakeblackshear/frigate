import { useCallback, useEffect, useMemo, useState } from "react";
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

import { LuPencil, LuPlus, LuShield, LuUserCog } from "react-icons/lu";
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
import CreateRoleDialog from "@/components/overlay/CreateRoleDialog";
import EditRoleCamerasDialog from "@/components/overlay/EditRoleCamerasDialog";
import { useTranslation } from "react-i18next";
import DeleteRoleDialog from "@/components/overlay/DeleteRoleDialog";
import { Separator } from "@/components/ui/separator";
import { CameraNameLabel } from "@/components/camera/FriendlyNameLabel";

type AuthenticationViewProps = {
  section?: "users" | "roles";
};

export default function AuthenticationView({
  section,
}: AuthenticationViewProps) {
  const { t } = useTranslation("views/settings");
  const { data: config, mutate: updateConfig } =
    useSWR<FrigateConfig>("config");
  const { data: users, mutate: mutateUsers } = useSWR<User[]>("users");

  const [showSetPassword, setShowSetPassword] = useState(false);
  const [showCreate, setShowCreate] = useState(false);
  const [showDelete, setShowDelete] = useState(false);
  const [showRoleChange, setShowRoleChange] = useState(false);
  const [showCreateRole, setShowCreateRole] = useState(false);
  const [showEditRole, setShowEditRole] = useState(false);
  const [showDeleteRole, setShowDeleteRole] = useState(false);
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [isPasswordLoading, setIsPasswordLoading] = useState(false);

  const [selectedUser, setSelectedUser] = useState<string>();
  const [selectedUserRole, setSelectedUserRole] = useState<string>();

  const [selectedRole, setSelectedRole] = useState<string>();
  const [currentRoleCameras, setCurrentRoleCameras] = useState<string[]>([]);
  const [selectedRoleForDelete, setSelectedRoleForDelete] = useState<string>();

  useEffect(() => {
    document.title = t("documentTitle.authentication");
  }, [t]);

  const onSavePassword = useCallback(
    (user: string, password: string, oldPassword?: string) => {
      setIsPasswordLoading(true);
      axios
        .put(`users/${user}/password`, { password, old_password: oldPassword })
        .then((response) => {
          if (response.status === 200) {
            setShowSetPassword(false);
            setPasswordError(null);
            setIsPasswordLoading(false);
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

          // Keep dialog open and show error
          setPasswordError(errorMessage);
          setIsPasswordLoading(false);
        });
    },
    [t],
  );

  const onCreate = (user: string, password: string, role: string) => {
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

  const onChangeRole = (user: string, newRole: string) => {
    if (user === "admin") return;

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

  type ConfigSetBody = {
    requires_restart: number;
    config_data: {
      auth: {
        roles: {
          [key: string]: string[] | string;
        };
      };
    };
    update_topic?: string;
  };

  const onCreateRole = useCallback(
    async (role: string, cameras: string[]) => {
      const configBody: ConfigSetBody = {
        requires_restart: 0,
        config_data: {
          auth: {
            roles: {
              [role]: cameras,
            },
          },
        },
        update_topic: "config/auth",
      };
      return axios
        .put("config/set", configBody)
        .then((response) => {
          if (response.status === 200) {
            setShowCreateRole(false);
            updateConfig();
            toast.success(t("roles.toast.success.createRole", { role }), {
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
            t("roles.toast.error.createRoleFailed", {
              errorMessage,
            }),
            {
              position: "top-center",
            },
          );
          throw error;
        });
    },
    [t, updateConfig],
  );

  const onEditRoleCameras = useCallback(
    async (cameras: string[]) => {
      if (!selectedRole) return;
      const configBody: ConfigSetBody = {
        requires_restart: 0,
        config_data: {
          auth: {
            roles: {
              [selectedRole]: cameras,
            },
          },
        },
        update_topic: "config/auth",
      };
      return axios
        .put("config/set", configBody)
        .then((response) => {
          if (response.status === 200) {
            setShowEditRole(false);
            setSelectedRole(undefined);
            setCurrentRoleCameras([]);
            updateConfig();
            toast.success(
              t("roles.toast.success.updateCameras", { role: selectedRole }),
              {
                position: "top-center",
              },
            );
          }
        })
        .catch((error) => {
          const errorMessage =
            error.response?.data?.message ||
            error.response?.data?.detail ||
            "Unknown error";
          toast.error(
            t("roles.toast.error.updateCamerasFailed", {
              errorMessage,
            }),
            {
              position: "top-center",
            },
          );
          throw error;
        });
    },
    [t, selectedRole, updateConfig],
  );

  const onDeleteRole = useCallback(
    async (role: string) => {
      // Update users assigned to this role to 'viewer'
      const usersToUpdate = users?.filter((user) => user.role === role) || [];
      if (usersToUpdate.length > 0) {
        Promise.all(
          usersToUpdate.map((user) =>
            axios.put(`users/${user.username}/role`, { role: "viewer" }),
          ),
        )
          .then(() => {
            mutateUsers(
              (users) =>
                users?.map((u) =>
                  u.role === role ? { ...u, role: "viewer" } : u,
                ),
              false,
            );
            toast.success(
              t("roles.toast.success.userRolesUpdated", {
                count: usersToUpdate.length,
              }),
              { position: "top-center" },
            );
          })
          .catch((error) => {
            const errorMessage =
              error.response?.data?.message ||
              error.response?.data?.detail ||
              "Unknown error";
            toast.error(
              t("roles.toast.error.userUpdateFailed", { errorMessage }),
              { position: "top-center" },
            );
          });
      }

      // Now delete the role from config
      const configBody: ConfigSetBody = {
        requires_restart: 0,
        config_data: {
          auth: {
            roles: {
              [role]: "",
            },
          },
        },
        update_topic: "config/auth",
      };
      return axios
        .put("config/set", configBody)
        .then((response) => {
          if (response.status === 200) {
            setShowDeleteRole(false);
            setSelectedRoleForDelete("");
            updateConfig();
            toast.success(t("roles.toast.success.deleteRole", { role }), {
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
            t("roles.toast.error.deleteRoleFailed", {
              errorMessage,
            }),
            {
              position: "top-center",
            },
          );
          throw error;
        });
    },
    [t, updateConfig, users, mutateUsers],
  );

  const roles = config?.auth?.roles
    ? Object.entries(config.auth.roles)
        .filter(([name]) => name !== "admin")
        .map(([name, data]) => ({
          name,
          cameras: Array.isArray(data) ? data : [],
        }))
    : [];

  const availableRoles = useMemo(() => {
    return config ? [...Object.keys(config.auth?.roles || {})] : [];
  }, [config]);

  if (!config || !users) {
    return (
      <div className="flex h-full w-full items-center justify-center">
        <ActivityIndicator />
      </div>
    );
  }

  // Users section
  const UsersSection = (
    <>
      <div className="mb-5 flex flex-row items-center justify-between gap-2 md:mr-3">
        <div className="flex flex-col items-start">
          <Heading as="h4" className="mb-2">
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
        <div className="scrollbar-container flex-1 overflow-hidden rounded-lg border border-border bg-background_alt md:mr-3">
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
                                        user.role || "viewer",
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
      <SetPasswordDialog
        show={showSetPassword}
        onCancel={() => {
          setShowSetPassword(false);
          setPasswordError(null);
        }}
        initialError={passwordError}
        onSave={(password, oldPassword) =>
          onSavePassword(selectedUser!, password, oldPassword)
        }
        isLoading={isPasswordLoading}
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
          availableRoles={availableRoles}
          onSave={(role) => onChangeRole(selectedUser!, role)}
          onCancel={() => setShowRoleChange(false)}
        />
      )}
    </>
  );

  // Roles section
  const RolesSection = (
    <>
      <div className="mb-5 flex flex-row items-center justify-between gap-2 md:mr-3">
        <div className="flex flex-col items-start">
          <Heading as="h4" className="mb-2">
            {t("roles.management.title")}
          </Heading>
          <p className="text-sm text-muted-foreground">
            {t("roles.management.desc")}
          </p>
        </div>
        <Button
          className="flex items-center gap-2 self-start sm:self-auto"
          aria-label={t("roles.addRole")}
          variant="default"
          onClick={() => setShowCreateRole(true)}
        >
          <LuPlus className="size-4" />
          {t("roles.addRole")}
        </Button>
      </div>
      <div className="mb-6 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div className="scrollbar-container flex-1 overflow-hidden rounded-lg border border-border bg-background_alt md:mr-3">
          <div className="h-full overflow-auto">
            <Table>
              <TableHeader className="sticky top-0 bg-muted/50">
                <TableRow>
                  <TableHead className="w-[250px]">
                    {t("roles.table.role")}
                  </TableHead>
                  <TableHead>{t("roles.table.cameras")}</TableHead>
                  <TableHead className="text-right">
                    {t("roles.table.actions")}
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {roles.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={3} className="h-24 text-center">
                      {t("roles.table.noRoles")}
                    </TableCell>
                  </TableRow>
                ) : (
                  roles.map((roleData) => (
                    <TableRow key={roleData.name} className="group">
                      <TableCell className="font-medium">
                        {roleData.name}
                      </TableCell>
                      <TableCell>
                        {roleData.cameras.length === 0 ? (
                          <Badge
                            variant="default"
                            className="bg-primary/20 text-xs text-primary hover:bg-primary/30"
                          >
                            {t("menu.live.allCameras", { ns: "common" })}
                          </Badge>
                        ) : roleData.cameras.length > 5 ? (
                          <Badge variant="outline" className="text-xs">
                            {roleData.cameras.length} cameras
                          </Badge>
                        ) : (
                          <div className="flex flex-wrap gap-1">
                            {roleData.cameras.map((camera) => (
                              <Badge
                                key={camera}
                                variant="outline"
                                className="text-xs"
                              >
                                <CameraNameLabel
                                  camera={camera}
                                  className="text-xs smart-capitalize"
                                />
                              </Badge>
                            ))}
                          </div>
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        <TooltipProvider>
                          <div className="flex items-center justify-end gap-2">
                            {roleData.name !== "admin" &&
                              roleData.name !== "viewer" && (
                                <>
                                  <Tooltip>
                                    <TooltipTrigger asChild>
                                      <Button
                                        size="sm"
                                        variant="outline"
                                        className="h-8 px-2"
                                        onClick={() => {
                                          setSelectedRole(roleData.name);
                                          setCurrentRoleCameras(
                                            roleData.cameras,
                                          );
                                          setShowEditRole(true);
                                        }}
                                        disabled={roleData.name === "admin"}
                                      >
                                        <LuPencil className="size-3.5" />
                                        <span className="ml-1.5 hidden sm:inline-block">
                                          {t("roles.table.editCameras")}
                                        </span>
                                      </Button>
                                    </TooltipTrigger>
                                    <TooltipContent>
                                      <p>{t("roles.table.editCameras")}</p>
                                    </TooltipContent>
                                  </Tooltip>

                                  <Tooltip>
                                    <TooltipTrigger asChild>
                                      <Button
                                        size="sm"
                                        variant="destructive"
                                        className="h-8 px-2"
                                        onClick={() => {
                                          setSelectedRoleForDelete(
                                            roleData.name,
                                          );
                                          setShowDeleteRole(true);
                                        }}
                                        disabled={roleData.name === "admin"}
                                      >
                                        <HiTrash className="size-3.5" />
                                        <span className="ml-1.5 hidden sm:inline-block">
                                          {t("button.delete", {
                                            ns: "common",
                                          })}
                                        </span>
                                      </Button>
                                    </TooltipTrigger>
                                    <TooltipContent>
                                      <p>{t("roles.table.deleteRole")}</p>
                                    </TooltipContent>
                                  </Tooltip>
                                </>
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
      <CreateRoleDialog
        show={showCreateRole}
        config={config}
        onCreate={onCreateRole}
        onCancel={() => setShowCreateRole(false)}
      />
      {selectedRole && (
        <EditRoleCamerasDialog
          show={showEditRole}
          config={config}
          role={selectedRole}
          currentCameras={currentRoleCameras}
          onSave={onEditRoleCameras}
          onCancel={() => {
            setShowEditRole(false);
            setSelectedRole(undefined);
            setCurrentRoleCameras([]);
          }}
        />
      )}
      <DeleteRoleDialog
        show={showDeleteRole}
        role={selectedRoleForDelete || ""}
        onCancel={() => {
          setShowDeleteRole(false);
          setSelectedRoleForDelete("");
        }}
        onDelete={async () => {
          if (selectedRoleForDelete) {
            try {
              await onDeleteRole(selectedRoleForDelete);
            } catch (error) {
              // Error handling is already done in onDeleteRole
            }
          }
        }}
      />
    </>
  );

  return (
    <div className="flex size-full flex-col">
      <Toaster position="top-center" closeButton={true} />
      <div className="scrollbar-container order-last mb-2 mt-2 flex h-full w-full flex-col overflow-y-auto pb-2 md:order-none md:mr-3 md:mt-0">
        {section === "users" && UsersSection}
        {section === "roles" && RolesSection}
        {!section && (
          <>
            {UsersSection}
            <Separator className="my-6 flex bg-secondary" />
            {RolesSection}
          </>
        )}
      </div>
    </div>
  );
}
