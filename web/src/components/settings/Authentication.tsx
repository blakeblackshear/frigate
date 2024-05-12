import { useCallback, useEffect, useState } from "react";
import ActivityIndicator from "@/components/indicators/activity-indicator";
import { FrigateConfig } from "@/types/frigateConfig";
import { Toaster } from "@/components/ui/sonner";
import useSWR from "swr";
import Heading from "../ui/heading";
import { User } from "@/types/user";
import { Button } from "../ui/button";
import SetPasswordDialog from "../overlay/SetPasswordDialog";
import axios from "axios";
import CreateUserDialog from "../overlay/CreateUserDialog";
import { toast } from "sonner";
import DeleteUserDialog from "../overlay/DeleteUserDialog";
import { Card } from "../ui/card";

export default function Authentication() {
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
          // console.log("saved");
        }
      })
      .catch((error) => {
        if (error.response?.data?.message) {
          // console.log("error");
        } else {
          // console.log("error");
        }
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
    <div className="flex flex-col md:flex-row size-full">
      <Toaster position="top-center" closeButton={true} />
      <div className="flex flex-col h-full w-full overflow-y-auto mt-2 md:mt-0 mb-10 md:mb-0 order-last md:order-none md:mr-2 rounded-lg border-secondary-foreground border-[1px] p-2 bg-background_alt">
        <Heading as="h3" className="my-2">
          Users
        </Heading>
        <div className="flex flex-row justify-end items-center gap-2">
          <Button
            variant="select"
            onClick={() => {
              setShowCreate(true);
            }}
          >
            Add User
          </Button>
        </div>
        <div className="mt-3 space-y-3">
          {users.map((u) => (
            <Card key={u.username} className="p-2 mb-1">
              <div className="flex items-center gap-3">
                <div className="flex flex-none ml-3 text-lg align-middle text-ellipsis overflow-hidden shrink">
                  {u.username}
                </div>
                <div className="flex flex-1 justify-end space-x-2 ">
                  <Button
                    variant="secondary"
                    onClick={() => {
                      setShowSetPassword(true);
                      setSelectedUser(u.username);
                    }}
                  >
                    Set Password
                  </Button>
                  <Button
                    variant="destructive"
                    onClick={() => {
                      setShowDelete(true);
                      setSelectedUser(u.username);
                    }}
                  >
                    Delete
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
