/**
 * GUI Configuration Editor for Frigate
 * Provides a comprehensive form-based interface for editing configuration
 */

import * as React from "react";
import { useForm, FormProvider } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import useSWR from "swr";
import axios from "axios";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { toast } from "sonner";
import {
  Video,
  Cpu,
  Target,
  HardDrive,
  Camera,
  Activity,
  Wifi,
  Volume2,
  Users,
  Brain,
  CarFront,
  Search,
  Eye,
  FileText,
  Settings,
  Shield,
  Palette,
  Server,
  AlertCircle,
} from "lucide-react";
import { ConfigSchema } from "@/types/configSchema";
import { CamerasSection } from "./sections/CamerasSection";
import { GenericSection } from "./sections/GenericSection";
import ActivityIndicator from "@/components/indicators/activity-indicator";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

export interface GuiConfigEditorProps {
  config: Record<string, unknown>;
  onSave: (config: Record<string, unknown>) => Promise<void>;
}

/**
 * GuiConfigEditor component provides a tabbed, form-based configuration editor
 */
export function GuiConfigEditor({ config, onSave }: GuiConfigEditorProps) {
  // Fetch the JSON schema
  const { data: schema, error: schemaError } = useSWR<ConfigSchema>(
    "config/schema.json",
    {
      revalidateOnFocus: false,
    },
  );

  const [isSaving, setIsSaving] = React.useState(false);

  // Initialize form with react-hook-form
  const methods = useForm({
    defaultValues: config,
    mode: "onChange",
  });

  const { handleSubmit, formState, reset } = methods;

  // Update form when config changes
  React.useEffect(() => {
    reset(config);
  }, [config, reset]);

  const onSubmit = async (data: Record<string, unknown>) => {
    try {
      setIsSaving(true);
      await onSave(data);
      toast.success("Configuration saved successfully", {
        position: "top-center",
      });
    } catch (error) {
      toast.error("Failed to save configuration", {
        position: "top-center",
      });
    } finally {
      setIsSaving(false);
    }
  };

  if (schemaError) {
    return (
      <Alert variant="destructive">
        <AlertCircle className="h-4 w-4" />
        <AlertTitle>Error Loading Schema</AlertTitle>
        <AlertDescription>
          Failed to load configuration schema. Please try refreshing the page.
        </AlertDescription>
      </Alert>
    );
  }

  if (!schema) {
    return <ActivityIndicator />;
  }

  return (
    <FormProvider {...methods}>
      <form onSubmit={handleSubmit(onSubmit)} className="h-full flex flex-col">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-2xl font-bold">Configuration Editor</h2>
            <p className="text-sm text-muted-foreground">
              Use the form below to configure all Frigate settings
            </p>
          </div>
          <div className="flex gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => reset(config)}
              disabled={!formState.isDirty}
            >
              Reset
            </Button>
            <Button type="submit" disabled={isSaving || !formState.isDirty}>
              {isSaving ? "Saving..." : "Save Configuration"}
            </Button>
          </div>
        </div>

        {formState.isDirty && (
          <Alert className="mb-4">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              You have unsaved changes. Don't forget to save before leaving.
            </AlertDescription>
          </Alert>
        )}

        <Tabs defaultValue="cameras" className="flex-1 flex flex-col">
          <ScrollArea className="w-full">
            <TabsList className="w-full justify-start h-auto flex-wrap">
              <TabsTrigger value="cameras" className="gap-2">
                <Video className="h-4 w-4" />
                Cameras
              </TabsTrigger>
              <TabsTrigger value="detectors" className="gap-2">
                <Cpu className="h-4 w-4" />
                Detectors
              </TabsTrigger>
              <TabsTrigger value="objects" className="gap-2">
                <Target className="h-4 w-4" />
                Objects
              </TabsTrigger>
              <TabsTrigger value="record" className="gap-2">
                <HardDrive className="h-4 w-4" />
                Recording
              </TabsTrigger>
              <TabsTrigger value="snapshots" className="gap-2">
                <Camera className="h-4 w-4" />
                Snapshots
              </TabsTrigger>
              <TabsTrigger value="motion" className="gap-2">
                <Activity className="h-4 w-4" />
                Motion
              </TabsTrigger>
              <TabsTrigger value="mqtt" className="gap-2">
                <Wifi className="h-4 w-4" />
                MQTT
              </TabsTrigger>
              <TabsTrigger value="audio" className="gap-2">
                <Volume2 className="h-4 w-4" />
                Audio
              </TabsTrigger>
              <TabsTrigger value="face" className="gap-2">
                <Users className="h-4 w-4" />
                Face Recognition
              </TabsTrigger>
              <TabsTrigger value="lpr" className="gap-2">
                <CarFront className="h-4 w-4" />
                License Plates
              </TabsTrigger>
              <TabsTrigger value="search" className="gap-2">
                <Search className="h-4 w-4" />
                Semantic Search
              </TabsTrigger>
              <TabsTrigger value="birdseye" className="gap-2">
                <Eye className="h-4 w-4" />
                Birdseye
              </TabsTrigger>
              <TabsTrigger value="review" className="gap-2">
                <FileText className="h-4 w-4" />
                Review
              </TabsTrigger>
              <TabsTrigger value="genai" className="gap-2">
                <Brain className="h-4 w-4" />
                GenAI
              </TabsTrigger>
              <TabsTrigger value="auth" className="gap-2">
                <Shield className="h-4 w-4" />
                Authentication
              </TabsTrigger>
              <TabsTrigger value="ui" className="gap-2">
                <Palette className="h-4 w-4" />
                UI Settings
              </TabsTrigger>
              <TabsTrigger value="advanced" className="gap-2">
                <Server className="h-4 w-4" />
                Advanced
              </TabsTrigger>
            </TabsList>
          </ScrollArea>

          <div className="flex-1 mt-4">
            <TabsContent value="cameras" className="h-full m-0">
              <CamerasSection schema={schema} />
            </TabsContent>

            <TabsContent value="detectors" className="h-full m-0">
              <GenericSection
                title="Detectors"
                description="Configure hardware accelerators for object detection"
                schema={schema}
                propertyName="detectors"
                icon={<Cpu className="h-6 w-6" />}
              />
            </TabsContent>

            <TabsContent value="objects" className="h-full m-0">
              <GenericSection
                title="Objects"
                description="Configure which objects to detect and track"
                schema={schema}
                propertyName="objects"
                icon={<Target className="h-6 w-6" />}
              />
            </TabsContent>

            <TabsContent value="record" className="h-full m-0">
              <GenericSection
                title="Recording"
                description="Configure recording retention and storage settings"
                schema={schema}
                propertyName="record"
                icon={<HardDrive className="h-6 w-6" />}
              />
            </TabsContent>

            <TabsContent value="snapshots" className="h-full m-0">
              <GenericSection
                title="Snapshots"
                description="Configure snapshot capture and retention"
                schema={schema}
                propertyName="snapshots"
                icon={<Camera className="h-6 w-6" />}
              />
            </TabsContent>

            <TabsContent value="motion" className="h-full m-0">
              <GenericSection
                title="Motion Detection"
                description="Configure motion detection sensitivity and masking"
                schema={schema}
                propertyName="motion"
                icon={<Activity className="h-6 w-6" />}
              />
            </TabsContent>

            <TabsContent value="mqtt" className="h-full m-0">
              <GenericSection
                title="MQTT"
                description="Configure MQTT broker connection and topics"
                schema={schema}
                propertyName="mqtt"
                icon={<Wifi className="h-6 w-6" />}
              />
            </TabsContent>

            <TabsContent value="audio" className="h-full m-0">
              <GenericSection
                title="Audio Detection"
                description="Configure audio detection and transcription"
                schema={schema}
                propertyName="audio"
                icon={<Volume2 className="h-6 w-6" />}
              />
            </TabsContent>

            <TabsContent value="face" className="h-full m-0">
              <GenericSection
                title="Face Recognition"
                description="Configure face recognition model and thresholds"
                schema={schema}
                propertyName="face_recognition"
                icon={<Users className="h-6 w-6" />}
              />
            </TabsContent>

            <TabsContent value="lpr" className="h-full m-0">
              <GenericSection
                title="License Plate Recognition"
                description="Configure license plate detection and recognition"
                schema={schema}
                propertyName="lpr"
                icon={<CarFront className="h-6 w-6" />}
              />
            </TabsContent>

            <TabsContent value="search" className="h-full m-0">
              <GenericSection
                title="Semantic Search"
                description="Configure AI-powered semantic search capabilities"
                schema={schema}
                propertyName="semantic_search"
                icon={<Search className="h-6 w-6" />}
              />
            </TabsContent>

            <TabsContent value="birdseye" className="h-full m-0">
              <GenericSection
                title="Birdseye View"
                description="Configure multi-camera overview display"
                schema={schema}
                propertyName="birdseye"
                icon={<Eye className="h-6 w-6" />}
              />
            </TabsContent>

            <TabsContent value="review" className="h-full m-0">
              <GenericSection
                title="Review System"
                description="Configure review and event management"
                schema={schema}
                propertyName="review"
                icon={<FileText className="h-6 w-6" />}
              />
            </TabsContent>

            <TabsContent value="genai" className="h-full m-0">
              <GenericSection
                title="GenAI"
                description="Configure generative AI features and provider"
                schema={schema}
                propertyName="genai"
                icon={<Brain className="h-6 w-6" />}
              />
            </TabsContent>

            <TabsContent value="auth" className="h-full m-0">
              <GenericSection
                title="Authentication"
                description="Configure user authentication and roles"
                schema={schema}
                propertyName="auth"
                icon={<Shield className="h-6 w-6" />}
              />
            </TabsContent>

            <TabsContent value="ui" className="h-full m-0">
              <GenericSection
                title="UI Settings"
                description="Configure user interface preferences"
                schema={schema}
                propertyName="ui"
                icon={<Palette className="h-6 w-6" />}
              />
            </TabsContent>

            <TabsContent value="advanced" className="h-full m-0">
              <div className="space-y-6">
                <GenericSection
                  title="Database"
                  description="Database configuration"
                  schema={schema}
                  propertyName="database"
                  icon={<Server className="h-6 w-6" />}
                />
                <GenericSection
                  title="Logger"
                  description="Logging configuration"
                  schema={schema}
                  propertyName="logger"
                  icon={<FileText className="h-6 w-6" />}
                />
                <GenericSection
                  title="Telemetry"
                  description="System monitoring and stats"
                  schema={schema}
                  propertyName="telemetry"
                  icon={<Activity className="h-6 w-6" />}
                />
              </div>
            </TabsContent>
          </div>
        </Tabs>
      </form>
    </FormProvider>
  );
}