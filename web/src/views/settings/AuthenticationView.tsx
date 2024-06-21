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
import { Card } from "@/components/ui/card";
import { HiTrash } from "react-icons/hi";
import { FaUserEdit } from "react-icons/fa";
import { LuPlus } from "react-icons/lu";

export default function AuthenticationView() {
  const { data: config } = useSWR<FrigateConfig>("config");
  const { data: users, mutate: mutateUsers } = useSWR<User[]>("users");

  const [showSetPassword, setShowSetPassword] = useState(false);
  const [showCreate, setShowCreate] = useState(false);
  const [showDelete, setShowDelete] = useState(false);

  const [selectedUser, setSelectedUser] = useState<string>();

  useEffect(() => {
    document.title = "Authentication Settings - Frigate";
  }, []);

  const onSavePassword = useCallback((user: string, password: string) => {
    axios
      .put(`users/${user}/password`, {
        password: password,
      })
      .then((response) => {
        if (response.status == 200) {
          setShowSetPassword(false);
        }
      })
      .catch((_error) => {
        toast.error("Error setting password", {
          position: "top-center",
        });
      });
  }, []);

  const onCreate = async (user: string, password: string) => {
    try {
      await axios.post("users", {
        username: user,
        password: password,
      });
      setShowCreate(false);
      mutateUsers((users) => {
        users?.push({ username: user });
        return users;
      }, false);
    } catch (error) {
      toast.error("Error creating user. Check server logs.", {
        position: "top-center",
      });
    }
  };

  const onDelete = async (user: string) => {
    try {
      await axios.delete(`users/${user}`);
      setShowDelete(false);
      mutateUsers((users) => {
        return users?.filter((u) => {
          return u.username !== user;
        });
      }, false);
    } catch (error) {
      toast.error("Error deleting user. Check server logs.", {
        position: "top-center",
      });
    }
  };

  if (!config || !users) {
    return <ActivityIndicator />;
  }

  return (
    <div className="flex size-full flex-col md:flex-row">
      <Toaster position="top-center" closeButton={true} />
      <div className="scrollbar-container order-last mb-10 mt-2 flex h-full w-full flex-col overflow-y-auto rounded-lg border-[1px] border-secondary-foreground bg-background_alt p-2 md:order-none md:mb-0 md:mr-2 md:mt-0">
        <div className="flex flex-row items-center justify-between gap-2">
          <Heading as="h3" className="my-2">
            Users
          </Heading>
          <Button
            className="flex items-center gap-1"
            variant="default"
            onClick={() => {
              setShowCreate(true);
            }}
          >
            <LuPlus className="text-secondary-foreground" />
            Add User
          </Button>
        </div>
        <div className="mt-3 space-y-3">
          {users.map((u) => (
            <Card key={u.username} className="mb-1 p-2">
              <div className="flex items-center gap-3">
                <div className="ml-3 flex flex-none shrink overflow-hidden text-ellipsis align-middle text-lg">
                  {u.username}
                </div>
                <div className="flex flex-1 justify-end space-x-2">
                  <Button
                    className="flex items-center gap-1"
                    variant="secondary"
                    onClick={() => {
                      setShowSetPassword(true);
                      setSelectedUser(u.username);
                    }}
                  >
                    <FaUserEdit />
                    <div className="hidden md:block">Update Password</div>
                  </Button>
                  <Button
                    className="flex items-center gap-1"
                    variant="destructive"
                    onClick={() => {
                      setShowDelete(true);
                      setSelectedUser(u.username);
                    }}
                  >
                    <HiTrash />
                    <div className="hidden md:block">Delete</div>
                  </Button>
                </div>
              </div>
            </Card>
          ))}
        </div>
      </div>
      <SetPasswordDialog
        show={showSetPassword}
        onCancel={() => {
          setShowSetPassword(false);
        }}
        onSave={(password) => {
          onSavePassword(selectedUser!, password);
        }}
      />
      <DeleteUserDialog
        show={showDelete}
        onCancel={() => {
          setShowDelete(false);
        }}
        onDelete={() => {
          onDelete(selectedUser!);
        }}
      />
      <CreateUserDialog
        show={showCreate}
        onCreate={onCreate}
        onCancel={() => {
          setShowCreate(false);
        }}
      />
    </div>
  );
}
