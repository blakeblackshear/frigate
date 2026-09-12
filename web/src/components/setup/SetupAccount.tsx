import ActivityIndicator from "@/components/indicators/activity-indicator";
import CreateUserDialog from "@/components/overlay/CreateUserDialog";
import SetPasswordDialog from "@/components/overlay/SetPasswordDialog";
import { Button } from "@/components/ui/button";
import { AuthContext } from "@/context/auth-context";
import axios from "axios";
import { useCallback, useContext, useState } from "react";
import { useTranslation } from "react-i18next";
import { FaCircleCheck } from "react-icons/fa6";
import { toast } from "sonner";
import useSWR from "swr";

type User = {
  username: string;
  role: string;
};

type SetupAccountProps = {
  onNext: () => void;
  onBack: () => void;
  onSkip: () => void;
};

export default function SetupAccount({
  onNext,
  onBack,
  onSkip,
}: SetupAccountProps) {
  const { t } = useTranslation(["views/setup"]);
  const { auth } = useContext(AuthContext);

  const {
    data: users,
    isLoading,
    error: usersError,
    mutate: mutateUsers,
  } = useSWR<User[]>("users", { revalidateOnFocus: false });

  // the internal port has no signed in user, so the built-in admin is the
  // account being secured
  const adminUsername = auth.isAuthenticated
    ? (auth.user?.username ?? "admin")
    : "admin";

  const [showPassword, setShowPassword] = useState(false);
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [passwordSaving, setPasswordSaving] = useState(false);
  const [passwordSet, setPasswordSet] = useState(false);
  const [showCreate, setShowCreate] = useState(false);

  const handleSavePassword = useCallback(
    (password: string) => {
      setPasswordSaving(true);
      axios
        .put(`users/${adminUsername}/password`, { password })
        .then(() => {
          setShowPassword(false);
          setPasswordError(null);
          setPasswordSet(true);
        })
        .catch((error) => {
          setPasswordError(
            error.response?.data?.message ||
              error.response?.data?.detail ||
              t("setupWizard.errors.saveFailed"),
          );
        })
        .finally(() => setPasswordSaving(false));
    },
    [adminUsername, t],
  );

  const handleCreateUser = useCallback(
    (username: string, password: string, role: string) =>
      axios
        .post("users", { username, password, role })
        .then(() => {
          setShowCreate(false);
          mutateUsers();
        })
        .catch((error) => {
          toast.error(
            error.response?.data?.message ||
              error.response?.data?.detail ||
              t("setupWizard.account.userFailed"),
          );
        }),
    [mutateUsers, t],
  );

  const otherUsers = (users ?? []).filter(
    (user) => user.username !== adminUsername,
  );

  return (
    <div className="flex flex-col gap-4 py-4">
      <div>
        <h2 className="text-xl font-semibold">
          {t("setupWizard.account.title")}
        </h2>
        <p className="mt-1 text-sm text-muted-foreground">
          {auth.isAuthenticated
            ? t("setupWizard.account.descriptionSignedIn", {
                username: adminUsername,
              })
            : t("setupWizard.account.descriptionAnonymous")}
        </p>
      </div>

      <div className="flex flex-col gap-2">
        <div className="flex items-center justify-between rounded-md border p-3">
          <div className="flex flex-col gap-1">
            <span className="text-sm font-medium">{adminUsername}</span>
            {passwordSet && (
              <span className="flex items-center gap-2 text-xs text-muted-foreground">
                <FaCircleCheck className="size-3 text-success" />
                {t("setupWizard.account.passwordSet")}
              </span>
            )}
          </div>
          <Button
            type="button"
            variant="outline"
            onClick={() => setShowPassword(true)}
          >
            {t("setupWizard.account.changePassword")}
          </Button>
        </div>

        {otherUsers.map((user) => (
          <div
            key={user.username}
            className="flex items-center justify-between rounded-md border p-3"
          >
            <span className="text-sm font-medium">{user.username}</span>
            <span className="text-xs text-muted-foreground">{user.role}</span>
          </div>
        ))}
      </div>

      {isLoading && <ActivityIndicator />}

      {usersError && (
        <p className="rounded-md bg-muted p-3 text-xs text-muted-foreground">
          {t("setupWizard.account.usersFailed")}
        </p>
      )}

      <div className="flex flex-col items-center gap-3 py-4">
        <Button
          variant="select"
          className="w-full"
          onClick={() => setShowCreate(true)}
        >
          {t("setupWizard.account.addUser")}
        </Button>
      </div>

      <div className="flex flex-col gap-3 pt-6 sm:flex-row sm:justify-end sm:gap-4">
        <Button type="button" onClick={onBack}>
          {t("setupWizard.actions.back")}
        </Button>
        <div className="flex flex-1 justify-end gap-3">
          <Button type="button" onClick={onSkip}>
            {t("setupWizard.actions.skip")}
          </Button>
          <Button type="button" variant="select" onClick={onNext}>
            {t("setupWizard.actions.next")}
          </Button>
        </div>
      </div>

      {/* no username prop: passing one puts the dialog in current-password
          mode, which the admin is exempt from and an anonymous internal port
          user has no way to satisfy */}
      <SetPasswordDialog
        show={showPassword}
        initialError={passwordError}
        isLoading={passwordSaving}
        onSave={handleSavePassword}
        onCancel={() => {
          setShowPassword(false);
          setPasswordError(null);
        }}
      />

      <CreateUserDialog
        show={showCreate}
        onCreate={handleCreateUser}
        onCancel={() => setShowCreate(false)}
      />
    </div>
  );
}
