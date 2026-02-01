export type TriggerType = "thumbnail" | "description";
export type TriggerAction = "notification" | "sub_label" | "attribute";

export type Trigger = {
  enabled: boolean;
  name: string;
  type: TriggerType;
  data: string;
  threshold: number;
  actions: TriggerAction[];
  friendly_name?: string;
};
