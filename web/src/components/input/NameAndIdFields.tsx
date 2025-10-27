import { Control, FieldValues, Path, PathValue } from "react-hook-form";
import {
  FormField,
  FormItem,
  FormLabel,
  FormControl,
  FormDescription,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { useState, useEffect } from "react";
import { useFormContext } from "react-hook-form";
import { generateFixedHash, isValidId } from "@/utils/stringUtil";
import { useTranslation } from "react-i18next";

type NameAndIdFieldsProps<T extends FieldValues = FieldValues> = {
  control: Control<T>;
  type?: string;
  nameField: Path<T>;
  idField: Path<T>;
  nameLabel: string;
  nameDescription?: string;
  idLabel?: string;
  idDescription?: string;
  processId?: (name: string) => string;
  placeholderName?: string;
  placeholderId?: string;
};

export default function NameAndIdFields<T extends FieldValues = FieldValues>({
  control,
  type,
  nameField,
  idField,
  nameLabel,
  nameDescription,
  idLabel,
  idDescription,
  processId,
  placeholderName,
  placeholderId,
}: NameAndIdFieldsProps<T>) {
  const { t } = useTranslation(["common"]);
  const { watch, setValue, trigger } = useFormContext<T>();
  const [isIdVisible, setIsIdVisible] = useState(false);

  const defaultProcessId = (name: string) => {
    const normalized = name.replace(/\s+/g, "_").toLowerCase();
    if (isValidId(normalized)) {
      return normalized;
    } else {
      return generateFixedHash(name, type);
    }
  };

  const effectiveProcessId = processId || defaultProcessId;

  useEffect(() => {
    const subscription = watch((value, { name }) => {
      if (name === nameField) {
        const processedId = effectiveProcessId(value[nameField] || "");
        setValue(idField, processedId as PathValue<T, Path<T>>);
        trigger(idField);
      }
    });
    return () => subscription.unsubscribe();
  }, [watch, setValue, trigger, nameField, idField, effectiveProcessId]);

  return (
    <>
      <FormField
        control={control}
        name={nameField}
        render={({ field }) => (
          <FormItem>
            <div className="flex items-center justify-between">
              <FormLabel>{nameLabel}</FormLabel>
              <span
                className="cursor-pointer text-right text-xs text-muted-foreground"
                onClick={() => setIsIdVisible(!isIdVisible)}
              >
                {isIdVisible
                  ? t("label.hide", { item: idLabel ?? t("label.ID") })
                  : t("label.show", {
                      item: idLabel ?? t("label.ID"),
                    })}
              </span>
            </div>
            <FormControl>
              <Input
                className="text-md"
                placeholder={placeholderName}
                {...field}
              />
            </FormControl>
            {nameDescription && (
              <FormDescription>{nameDescription}</FormDescription>
            )}
            <FormMessage />
          </FormItem>
        )}
      />
      {isIdVisible && (
        <FormField
          control={control}
          name={idField}
          render={({ field }) => (
            <FormItem>
              <FormLabel>{idLabel ?? t("label.ID")}</FormLabel>
              <FormControl>
                <Input
                  className="text-md"
                  placeholder={placeholderId}
                  {...field}
                />
              </FormControl>
              <FormDescription>
                {idDescription ?? t("field.internalID")}
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />
      )}
    </>
  );
}
