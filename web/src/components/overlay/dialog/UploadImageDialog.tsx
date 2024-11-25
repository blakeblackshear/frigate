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
import { useForm } from "react-hook-form";
import { z } from "zod";

type UploadImageDialogProps = {
  open: boolean;
  title: string;
  description?: string;
  setOpen: (open: boolean) => void;
};
export default function UploadImageDialog({
  open,
  title,
  description,
  setOpen,
}: UploadImageDialogProps) {
  const formSchema = z.object({
    image: z
      .instanceof(File, { message: "Please select an image file." })
      .refine((file) => file.size < 1000000, "Image size is too large."),
  });

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    mode: "onChange",
  });

  return (
    <Dialog open={open} defaultOpen={false} onOpenChange={setOpen}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          {description && <DialogDescription>{description}</DialogDescription>}
        </DialogHeader>
        <Form {...form}>
          <form>
            <FormField
              control={form.control}
              name="image"
              render={({ field }) => (
                <FormItem>
                  <FormControl>
                    {
                      // @ts-expect-error ignore
                      <Input
                        className="aspect-video h-40 w-full"
                        type="file"
                        {...field}
                      />
                    }
                  </FormControl>
                </FormItem>
              )}
            />
          </form>
        </Form>
        <DialogFooter>
          <Button onClick={() => setOpen(false)}>Cancel</Button>
          <Button variant="select">Save</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
