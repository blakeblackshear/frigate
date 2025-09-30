/**
 * Cameras configuration section
 * Comprehensive camera setup including streams, detection, zones, etc.
 */

import * as React from "react";
import { useFormContext, useWatch } from "react-hook-form";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Plus, Trash2, Video } from "lucide-react";
import { SchemaFormRenderer, RenderFields } from "../SchemaFormRenderer";
import { ConfigSchema, ObjectSchema } from "@/types/configSchema";
import { ScrollArea } from "@/components/ui/scroll-area";

export interface CamerasSectionProps {
  schema: ConfigSchema;
}

/**
 * CamerasSection renders the complete camera configuration UI
 * Includes all camera fields: streams, detect, motion, record, snapshots, zones, etc.
 */
export function CamerasSection({ schema }: CamerasSectionProps) {
  const { setValue, getValues } = useFormContext();
  const cameras = useWatch({ name: "cameras" }) as Record<string, unknown> | undefined;

  const cameraNames = React.useMemo(() => {
    if (!cameras || typeof cameras !== "object") return [];
    return Object.keys(cameras);
  }, [cameras]);

  const [selectedCamera, setSelectedCamera] = React.useState<string | null>(
    cameraNames.length > 0 ? cameraNames[0] : null,
  );

  const handleAddCamera = () => {
    const newCameraName = `camera_${cameraNames.length + 1}`;
    const currentCameras = (cameras || {}) as Record<string, unknown>;

    // Get default camera structure from schema
    const cameraSchema = schema.properties?.cameras as ObjectSchema | undefined;
    const cameraItemSchema =
      cameraSchema?.additionalProperties &&
      typeof cameraSchema.additionalProperties === "object"
        ? (cameraSchema.additionalProperties as ObjectSchema)
        : undefined;

    setValue(
      `cameras.${newCameraName}`,
      {
        friendly_name: newCameraName,
        enabled: true,
        ffmpeg: {
          inputs: [],
        },
        detect: {
          enabled: true,
          width: 1280,
          height: 720,
          fps: 5,
        },
        record: {
          enabled: false,
        },
        snapshots: {
          enabled: false,
        },
      },
      { shouldDirty: true },
    );
    setSelectedCamera(newCameraName);
  };

  const handleDeleteCamera = (cameraName: string) => {
    if (!cameras) return;
    const currentCameras = { ...cameras } as Record<string, unknown>;
    delete currentCameras[cameraName];
    setValue("cameras", currentCameras, { shouldDirty: true });

    // Select another camera if available
    const remaining = Object.keys(currentCameras);
    setSelectedCamera(remaining.length > 0 ? remaining[0] : null);
  };

  // Get camera schema from root schema
  const cameraSchema = React.useMemo(() => {
    const camerasSchema = schema.properties?.cameras as ObjectSchema | undefined;
    if (
      camerasSchema?.additionalProperties &&
      typeof camerasSchema.additionalProperties === "object"
    ) {
      return camerasSchema.additionalProperties as ObjectSchema;
    }
    return undefined;
  }, [schema]);

  if (!cameraSchema) {
    return (
      <div className="text-center py-8">
        <p className="text-muted-foreground">Camera schema not found</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold">Cameras</h3>
          <p className="text-sm text-muted-foreground">
            Configure cameras, streams, detection, recording, and zones
          </p>
        </div>
        <Button onClick={handleAddCamera}>
          <Plus className="h-4 w-4 mr-2" />
          Add Camera
        </Button>
      </div>

      {cameraNames.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Video className="h-12 w-12 text-muted-foreground mb-4" />
            <p className="text-lg font-medium mb-2">No cameras configured</p>
            <p className="text-sm text-muted-foreground mb-4">
              Get started by adding your first camera
            </p>
            <Button onClick={handleAddCamera}>
              <Plus className="h-4 w-4 mr-2" />
              Add Camera
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-12 gap-4">
          {/* Camera list sidebar */}
          <Card className="col-span-3">
            <CardHeader>
              <CardTitle className="text-sm">Camera List</CardTitle>
            </CardHeader>
            <CardContent className="p-2">
              <ScrollArea className="h-[600px]">
                <div className="space-y-1">
                  {cameraNames.map((cameraName) => (
                    <div
                      key={cameraName}
                      className={`flex items-center justify-between p-2 rounded cursor-pointer hover:bg-accent ${
                        selectedCamera === cameraName ? "bg-accent" : ""
                      }`}
                      onClick={() => setSelectedCamera(cameraName)}
                    >
                      <div className="flex items-center gap-2">
                        <Video className="h-4 w-4" />
                        <span className="text-sm truncate">{cameraName}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            </CardContent>
          </Card>

          {/* Camera configuration panel */}
          <Card className="col-span-9">
            {selectedCamera && (
              <>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle>{selectedCamera}</CardTitle>
                      <CardDescription>
                        Configure all settings for this camera
                      </CardDescription>
                    </div>
                    <Button
                      variant="destructive"
                      size="sm"
                      onClick={() => handleDeleteCamera(selectedCamera)}
                    >
                      <Trash2 className="h-4 w-4 mr-2" />
                      Delete
                    </Button>
                  </div>
                </CardHeader>
                <CardContent>
                  <ScrollArea className="h-[600px] pr-4">
                    <Tabs defaultValue="basic" className="w-full">
                      <TabsList className="grid w-full grid-cols-6">
                        <TabsTrigger value="basic">Basic</TabsTrigger>
                        <TabsTrigger value="streams">Streams</TabsTrigger>
                        <TabsTrigger value="detect">Detect</TabsTrigger>
                        <TabsTrigger value="record">Record</TabsTrigger>
                        <TabsTrigger value="motion">Motion</TabsTrigger>
                        <TabsTrigger value="advanced">Advanced</TabsTrigger>
                      </TabsList>

                      <TabsContent value="basic" className="space-y-4 mt-4">
                        {/* Basic camera settings */}
                        {cameraSchema.properties?.friendly_name && (
                          <SchemaFormRenderer
                            schema={cameraSchema.properties.friendly_name}
                            path={`cameras.${selectedCamera}.friendly_name`}
                            rootSchema={schema}
                          />
                        )}
                        {cameraSchema.properties?.enabled && (
                          <SchemaFormRenderer
                            schema={cameraSchema.properties.enabled}
                            path={`cameras.${selectedCamera}.enabled`}
                            rootSchema={schema}
                          />
                        )}
                        {cameraSchema.properties?.type && (
                          <SchemaFormRenderer
                            schema={cameraSchema.properties.type}
                            path={`cameras.${selectedCamera}.type`}
                            rootSchema={schema}
                          />
                        )}
                        {cameraSchema.properties?.webui_url && (
                          <SchemaFormRenderer
                            schema={cameraSchema.properties.webui_url}
                            path={`cameras.${selectedCamera}.webui_url`}
                            rootSchema={schema}
                          />
                        )}
                      </TabsContent>

                      <TabsContent value="streams" className="space-y-4 mt-4">
                        {/* FFmpeg streams configuration */}
                        {cameraSchema.properties?.ffmpeg && (
                          <SchemaFormRenderer
                            schema={cameraSchema.properties.ffmpeg}
                            path={`cameras.${selectedCamera}.ffmpeg`}
                            rootSchema={schema}
                          />
                        )}
                      </TabsContent>

                      <TabsContent value="detect" className="space-y-4 mt-4">
                        {/* Detection configuration */}
                        {cameraSchema.properties?.detect && (
                          <SchemaFormRenderer
                            schema={cameraSchema.properties.detect}
                            path={`cameras.${selectedCamera}.detect`}
                            rootSchema={schema}
                          />
                        )}
                        {cameraSchema.properties?.objects && (
                          <SchemaFormRenderer
                            schema={cameraSchema.properties.objects}
                            path={`cameras.${selectedCamera}.objects`}
                            rootSchema={schema}
                          />
                        )}
                        {cameraSchema.properties?.zones && (
                          <SchemaFormRenderer
                            schema={cameraSchema.properties.zones}
                            path={`cameras.${selectedCamera}.zones`}
                            rootSchema={schema}
                          />
                        )}
                      </TabsContent>

                      <TabsContent value="record" className="space-y-4 mt-4">
                        {/* Recording configuration */}
                        {cameraSchema.properties?.record && (
                          <SchemaFormRenderer
                            schema={cameraSchema.properties.record}
                            path={`cameras.${selectedCamera}.record`}
                            rootSchema={schema}
                          />
                        )}
                        {cameraSchema.properties?.snapshots && (
                          <SchemaFormRenderer
                            schema={cameraSchema.properties.snapshots}
                            path={`cameras.${selectedCamera}.snapshots`}
                            rootSchema={schema}
                          />
                        )}
                        {cameraSchema.properties?.review && (
                          <SchemaFormRenderer
                            schema={cameraSchema.properties.review}
                            path={`cameras.${selectedCamera}.review`}
                            rootSchema={schema}
                          />
                        )}
                      </TabsContent>

                      <TabsContent value="motion" className="space-y-4 mt-4">
                        {/* Motion detection configuration */}
                        {cameraSchema.properties?.motion && (
                          <SchemaFormRenderer
                            schema={cameraSchema.properties.motion}
                            path={`cameras.${selectedCamera}.motion`}
                            rootSchema={schema}
                          />
                        )}
                      </TabsContent>

                      <TabsContent value="advanced" className="space-y-4 mt-4">
                        {/* Advanced settings */}
                        {cameraSchema.properties?.audio && (
                          <SchemaFormRenderer
                            schema={cameraSchema.properties.audio}
                            path={`cameras.${selectedCamera}.audio`}
                            rootSchema={schema}
                          />
                        )}
                        {cameraSchema.properties?.onvif && (
                          <SchemaFormRenderer
                            schema={cameraSchema.properties.onvif}
                            path={`cameras.${selectedCamera}.onvif`}
                            rootSchema={schema}
                          />
                        )}
                        {cameraSchema.properties?.mqtt && (
                          <SchemaFormRenderer
                            schema={cameraSchema.properties.mqtt}
                            path={`cameras.${selectedCamera}.mqtt`}
                            rootSchema={schema}
                          />
                        )}
                        {cameraSchema.properties?.ui && (
                          <SchemaFormRenderer
                            schema={cameraSchema.properties.ui}
                            path={`cameras.${selectedCamera}.ui`}
                            rootSchema={schema}
                          />
                        )}
                      </TabsContent>
                    </Tabs>
                  </ScrollArea>
                </CardContent>
              </>
            )}
          </Card>
        </div>
      )}
    </div>
  );
}