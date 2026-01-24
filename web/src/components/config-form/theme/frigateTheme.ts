// Custom RJSF Theme for Frigate
// Maps RJSF templates and widgets to shadcn/ui components

import type {
  WidgetProps,
  FieldTemplateProps,
  RegistryWidgetsType,
  RegistryFieldsType,
  TemplatesType,
} from "@rjsf/utils";
import { getDefaultRegistry } from "@rjsf/core";

import { SwitchWidget } from "./widgets/SwitchWidget";
import { SelectWidget } from "./widgets/SelectWidget";
import { TextWidget } from "./widgets/TextWidget";
import { PasswordWidget } from "./widgets/PasswordWidget";
import { RangeWidget } from "./widgets/RangeWidget";
import { TagsWidget } from "./widgets/TagsWidget";
import { ColorWidget } from "./widgets/ColorWidget";
import { TextareaWidget } from "./widgets/TextareaWidget";
import { SwitchesWidget } from "./widgets/SwitchesWidget";
import { ObjectLabelSwitchesWidget } from "./widgets/ObjectLabelSwitchesWidget";
import { ZoneSwitchesWidget } from "./widgets/ZoneSwitchesWidget";

import { FieldTemplate } from "./templates/FieldTemplate";
import { ObjectFieldTemplate } from "./templates/ObjectFieldTemplate";
import { ArrayFieldTemplate } from "./templates/ArrayFieldTemplate";
import { BaseInputTemplate } from "./templates/BaseInputTemplate";
import { DescriptionFieldTemplate } from "./templates/DescriptionFieldTemplate";
import { TitleFieldTemplate } from "./templates/TitleFieldTemplate";
import { ErrorListTemplate } from "./templates/ErrorListTemplate";
import { SubmitButton } from "./templates/SubmitButton";
import { MultiSchemaFieldTemplate } from "./templates/MultiSchemaFieldTemplate";

export interface FrigateTheme {
  widgets: RegistryWidgetsType;
  templates: Partial<TemplatesType>;
  fields: RegistryFieldsType;
}

const defaultRegistry = getDefaultRegistry();

export const frigateTheme: FrigateTheme = {
  widgets: {
    ...defaultRegistry.widgets,
    // Override default widgets with shadcn/ui styled versions
    TextWidget: TextWidget,
    PasswordWidget: PasswordWidget,
    SelectWidget: SelectWidget,
    CheckboxWidget: SwitchWidget,
    // Custom widgets
    switch: SwitchWidget,
    password: PasswordWidget,
    select: SelectWidget,
    range: RangeWidget,
    tags: TagsWidget,
    color: ColorWidget,
    textarea: TextareaWidget,
    switches: SwitchesWidget,
    objectLabels: ObjectLabelSwitchesWidget,
    zoneNames: ZoneSwitchesWidget,
  },
  templates: {
    ...defaultRegistry.templates,
    FieldTemplate: FieldTemplate as React.ComponentType<FieldTemplateProps>,
    ObjectFieldTemplate: ObjectFieldTemplate,
    ArrayFieldTemplate: ArrayFieldTemplate,
    BaseInputTemplate: BaseInputTemplate as React.ComponentType<WidgetProps>,
    DescriptionFieldTemplate: DescriptionFieldTemplate,
    TitleFieldTemplate: TitleFieldTemplate,
    ErrorListTemplate: ErrorListTemplate,
    MultiSchemaFieldTemplate: MultiSchemaFieldTemplate,
    ButtonTemplates: {
      ...defaultRegistry.templates.ButtonTemplates,
      SubmitButton: SubmitButton,
    },
  },
  fields: {
    ...defaultRegistry.fields,
  },
};
