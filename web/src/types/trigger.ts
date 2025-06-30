export type TriggerType = "thumbnail" | "description";
export type TriggerAction = "alert" | "notification";

export type Trigger = {
  name: string;
  type: TriggerType;
  data: string;
  threshold: number;
  actions: TriggerAction[];
};
