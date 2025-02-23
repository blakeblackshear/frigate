import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { zodResolver } from "@hookform/resolvers/zod";
import { useCallback, useEffect } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";

type TextEntryDialogProps = {
  open: boolean;
  title: string;
  description?: string;
  setOpen: (open: boolean) => void;
  onSave: (text: string) => void;
  defaultValue?: string;
  allowEmpty?: boolean;
};

export default function TextEntryDialog({
  open,
  title,
  description,
  setOpen,
  onSave,
  defaultValue = "",
  allowEmpty = false,
}: TextEntryDialogProps) {
  const formSchema = z.object({
    text: z.string(),
  });

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: { text: defaultValue },
  });
  const fileRef = form.register("text");

  // upload handler

  const onSubmit = useCallback(
    (data: z.infer<typeof formSchema>) => {
      if (!allowEmpty && !data["text"]) {
        return;
      }
      onSave(data["text"]);
    },
    [onSave, allowEmpty],
  );

  useEffect(() => {
    if (open) {
      form.reset({ text: defaultValue });
    }
  }, [open, defaultValue, form]);

  return (
    <Dialog open={open} defaultOpen={false} onOpenChange={setOpen}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          {description && <DialogDescription>{description}</DialogDescription>}
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)}>
            <FormField
              control={form.control}
              name="text"
              render={() => (
                <FormItem>
                  <FormControl>
                    <Input
                      className="aspect-video h-8 w-full"
                      type="text"
                      {...fileRef}
                    />
                  </FormControl>
                </FormItem>
              )}
            />
            <DialogFooter className="pt-4">
              <Button onClick={() => setOpen(false)}>Cancel</Button>
              <Button variant="select" type="submit">
                Save
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
