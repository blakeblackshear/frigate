"use client";

import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "../ui/dialog";
import { Label } from "../ui/label";
import { LuCheck, LuX } from "react-icons/lu";

type SetPasswordProps = {
  show: boolean;
  onSave: (password: string) => void;
  onCancel: () => void;
  username?: string;
};

export default function SetPasswordDialog({
  show,
  onSave,
  onCancel,
  username,
}: SetPasswordProps) {
  const [password, setPassword] = useState<string>("");
  const [confirmPassword, setConfirmPassword] = useState<string>("");
  const [passwordStrength, setPasswordStrength] = useState<number>(0);
  const [error, setError] = useState<string | null>(null);

  // Reset state when dialog opens/closes
  useEffect(() => {
    if (show) {
      setPassword("");
      setConfirmPassword("");
      setError(null);
    }
  }, [show]);

  // Simple password strength calculation
  useEffect(() => {
    if (!password) {
      setPasswordStrength(0);
      return;
    }

    let strength = 0;
    // Length check
    if (password.length >= 8) strength += 1;
    // Contains number
    if (/\d/.test(password)) strength += 1;
    // Contains special char
    if (/[!@#$%^&*(),.?":{}|<>]/.test(password)) strength += 1;
    // Contains uppercase
    if (/[A-Z]/.test(password)) strength += 1;

    setPasswordStrength(strength);
  }, [password]);

  const handleSave = () => {
    if (!password) {
      setError("Password cannot be empty");
      return;
    }

    if (password !== confirmPassword) {
      setError("Passwords do not match");
      return;
    }

    onSave(password);
  };

  const getStrengthLabel = () => {
    if (!password) return "";
    if (passwordStrength <= 1) return "Weak";
    if (passwordStrength === 2) return "Medium";
    if (passwordStrength === 3) return "Strong";
    return "Very Strong";
  };

  const getStrengthColor = () => {
    if (!password) return "bg-gray-200";
    if (passwordStrength <= 1) return "bg-red-500";
    if (passwordStrength === 2) return "bg-yellow-500";
    if (passwordStrength === 3) return "bg-green-500";
    return "bg-green-600";
  };

  return (
    <Dialog open={show} onOpenChange={onCancel}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader className="space-y-2">
          <DialogTitle>
            {username ? `Update Password for ${username}` : "Set Password"}
          </DialogTitle>
          <DialogDescription>
            Create a strong password to secure this account.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="password">New Password</Label>
            <Input
              id="password"
              className="h-10"
              type="password"
              value={password}
              onChange={(event) => {
                setPassword(event.target.value);
                setError(null);
              }}
              placeholder="Enter new password"
              autoFocus
            />

            {/* Password strength indicator */}
            {password && (
              <div className="mt-2 space-y-1">
                <div className="flex h-1.5 w-full overflow-hidden rounded-full bg-secondary-foreground">
                  <div
                    className={`${getStrengthColor()} transition-all duration-300`}
                    style={{ width: `${(passwordStrength / 3) * 100}%` }}
                  />
                </div>
                <p className="text-xs text-muted-foreground">
                  Password strength:{" "}
                  <span className="font-medium">{getStrengthLabel()}</span>
                </p>
              </div>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="confirm-password">Confirm Password</Label>
            <Input
              id="confirm-password"
              className="h-10"
              type="password"
              value={confirmPassword}
              onChange={(event) => {
                setConfirmPassword(event.target.value);
                setError(null);
              }}
              placeholder="Confirm new password"
            />

            {/* Password match indicator */}
            {password && confirmPassword && (
              <div className="mt-1 flex items-center gap-1.5 text-xs">
                {password === confirmPassword ? (
                  <>
                    <LuCheck className="size-3.5 text-green-500" />
                    <span className="text-green-600">Passwords match</span>
                  </>
                ) : (
                  <>
                    <LuX className="size-3.5 text-red-500" />
                    <span className="text-red-600">Passwords don't match</span>
                  </>
                )}
              </div>
            )}
          </div>

          {error && (
            <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">
              {error}
            </div>
          )}
        </div>

        <DialogFooter className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <div className="flex flex-1 flex-col justify-end">
            <div className="flex flex-row gap-2 pt-5">
              <Button
                className="flex flex-1"
                aria-label="Cancel"
                onClick={onCancel}
                type="button"
              >
                Cancel
              </Button>
              <Button
                variant="select"
                aria-label="Save"
                className="flex flex-1"
                onClick={handleSave}
                disabled={!password || password !== confirmPassword}
              >
                Save
              </Button>
            </div>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
