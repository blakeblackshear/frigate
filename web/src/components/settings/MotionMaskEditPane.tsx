import Heading from "../ui/heading";
import { Separator } from "../ui/separator";
import { Button } from "@/components/ui/button";
import { Form, FormField, FormItem, FormMessage } from "@/components/ui/form";
import { useMemo } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { Polygon } from "@/types/canvas";
import PolygonEditControls from "./PolygonEditControls";
import { FaCheckCircle } from "react-icons/fa";

type MotionMaskEditPaneProps = {
  polygons?: Polygon[];
  setPolygons: React.Dispatch<React.SetStateAction<Polygon[]>>;
  activePolygonIndex?: number;
  onSave?: () => void;
  onCancel?: () => void;
};

export default function MotionMaskEditPane({
  polygons,
  setPolygons,
  activePolygonIndex,
  onSave,
  onCancel,
}: MotionMaskEditPaneProps) {
  const polygon = useMemo(() => {
    if (polygons && activePolygonIndex !== undefined) {
      return polygons[activePolygonIndex];
    } else {
      return null;
    }
  }, [polygons, activePolygonIndex]);

  const defaultName = useMemo(() => {
    if (!polygons) {
      return;
    }

    const count = polygons.filter((poly) => poly.type == "motion_mask").length;

    return `Motion Mask ${count + 1}`;
  }, [polygons]);

  const formSchema = z
    .object({
      polygon: z.object({ name: z.string(), isFinished: z.boolean() }),
    })
    .refine(() => polygon?.isFinished === true, {
      message: "The polygon drawing must be finished before saving.",
      path: ["polygon.isFinished"],
    });

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    mode: "onChange",
    defaultValues: {
      polygon: { isFinished: polygon?.isFinished ?? false, name: defaultName },
    },
  });

  function onSubmit(values: z.infer<typeof formSchema>) {
    // console.log("form values", values);
    // if (activePolygonIndex === undefined || !polygons) {
    //   return;
    // }

    // const updatedPolygons = [...polygons];
    // const activePolygon = updatedPolygons[activePolygonIndex];
    // updatedPolygons[activePolygonIndex] = {
    //   ...activePolygon,
    //   name: defaultName ?? "foo",
    // };
    // setPolygons(updatedPolygons);
    // console.log("active polygon", polygons[activePolygonIndex]);
    if (onSave) {
      onSave();
    }
  }

  if (!polygon) {
    return;
  }

  return (
    <>
      <Heading as="h3" className="my-2">
        {polygon.name.length ? "Edit" : "New"} Motion Mask
      </Heading>
      <div className="text-sm text-muted-foreground my-2">
        <p>
          Motion masks are used to prevent unwanted types of motion from
          triggering detection. Over masking will make it more difficult for
          objects to be tracked.
        </p>
      </div>
      <Separator className="my-3 bg-secondary" />
      {polygons && activePolygonIndex !== undefined && (
        <div className="flex flex-row my-2 text-sm w-full justify-between">
          <div className="my-1 inline-flex">
            {polygons[activePolygonIndex].points.length}{" "}
            {polygons[activePolygonIndex].points.length > 1 ||
            polygons[activePolygonIndex].points.length == 0
              ? "points"
              : "point"}
            {polygons[activePolygonIndex].isFinished && (
              <FaCheckCircle className="ml-2 size-5" />
            )}
          </div>
          <PolygonEditControls
            polygons={polygons}
            setPolygons={setPolygons}
            activePolygonIndex={activePolygonIndex}
          />
        </div>
      )}
      <div className="mb-3 text-sm text-muted-foreground">
        Click to draw a polygon on the image.
      </div>

      <Separator className="my-3 bg-secondary" />

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
          <FormField
            control={form.control}
            name="polygon.name"
            render={() => (
              <FormItem>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="polygon.isFinished"
            render={() => (
              <FormItem>
                <FormMessage />
              </FormItem>
            )}
          />
          <div className="flex flex-row gap-2 pt-5">
            <Button className="flex flex-1" onClick={onCancel}>
              Cancel
            </Button>
            <Button variant="select" className="flex flex-1" type="submit">
              Save
            </Button>
          </div>
        </form>
      </Form>
    </>
  );
}
