export type TriggerType = "thumbnail" | "description";
export type TriggerAction = "alert" | "notification";

export type Trigger = {
  enabled: boolean;
  name: string;
  type: TriggerType;
  data: string;
  threshold: number;
  actions: TriggerAction[];
};
