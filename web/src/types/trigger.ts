export type TriggerType = "image" | "text" | "both";
export type TriggerAction = "alert" | "notification";

export type Trigger = {
  name: string;
  type: TriggerType;
  data: string;
  threshold: number;
  actions: TriggerAction[];
};
