// Custom RJSF Theme for Frigate
// Maps RJSF templates and widgets to shadcn/ui components

import type {
  WidgetProps,
  FieldTemplateProps,
  RegistryWidgetsType,
  RegistryFieldsType,
  TemplatesType,
} from "@rjsf/utils";

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
import { AudioLabelSwitchesWidget } from "./widgets/AudioLabelSwitchesWidget";
import { ZoneSwitchesWidget } from "./widgets/ZoneSwitchesWidget";
import { ArrayAsTextWidget } from "./widgets/ArrayAsTextWidget";
import { FfmpegArgsWidget } from "./widgets/FfmpegArgsWidget";
import { InputRolesWidget } from "./widgets/InputRolesWidget";
import { TimezoneSelectWidget } from "./widgets/TimezoneSelectWidget";
import { CameraPathWidget } from "./widgets/CameraPathWidget";

import { FieldTemplate } from "./templates/FieldTemplate";
import { ObjectFieldTemplate } from "./templates/ObjectFieldTemplate";
import { ArrayFieldTemplate } from "./templates/ArrayFieldTemplate";
import { ArrayFieldItemTemplate } from "./templates/ArrayFieldItemTemplate";
import { BaseInputTemplate } from "./templates/BaseInputTemplate";
import { DescriptionFieldTemplate } from "./templates/DescriptionFieldTemplate";
import { TitleFieldTemplate } from "./templates/TitleFieldTemplate";
import { ErrorListTemplate } from "./templates/ErrorListTemplate";
import { MultiSchemaFieldTemplate } from "./templates/MultiSchemaFieldTemplate";
import { WrapIfAdditionalTemplate } from "./templates/WrapIfAdditionalTemplate";

import { LayoutGridField } from "./fields/LayoutGridField";
import { DetectorHardwareField } from "./fields/DetectorHardwareField";
import { ReplaceRulesField } from "./fields/ReplaceRulesField";
import { CameraInputsField } from "./fields/CameraInputsField";

export interface FrigateTheme {
  widgets: RegistryWidgetsType;
  templates: Partial<TemplatesType>;
  fields: RegistryFieldsType;
}

export const frigateTheme: FrigateTheme = {
  widgets: {
    // Override default widgets with shadcn/ui styled versions
    TextWidget: TextWidget,
    PasswordWidget: PasswordWidget,
    SelectWidget: SelectWidget,
    CheckboxWidget: SwitchWidget,
    ArrayAsTextWidget: ArrayAsTextWidget,
    FfmpegArgsWidget: FfmpegArgsWidget,
    CameraPathWidget: CameraPathWidget,
    inputRoles: InputRolesWidget,
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
    audioLabels: AudioLabelSwitchesWidget,
    zoneNames: ZoneSwitchesWidget,
    timezoneSelect: TimezoneSelectWidget,
  },
  templates: {
    FieldTemplate: FieldTemplate as React.ComponentType<FieldTemplateProps>,
    ObjectFieldTemplate: ObjectFieldTemplate,
    ArrayFieldTemplate: ArrayFieldTemplate,
    ArrayFieldItemTemplate: ArrayFieldItemTemplate,
    BaseInputTemplate: BaseInputTemplate as React.ComponentType<WidgetProps>,
    DescriptionFieldTemplate: DescriptionFieldTemplate,
    TitleFieldTemplate: TitleFieldTemplate,
    ErrorListTemplate: ErrorListTemplate,
    MultiSchemaFieldTemplate: MultiSchemaFieldTemplate,
    WrapIfAdditionalTemplate: WrapIfAdditionalTemplate,
  },
  fields: {
    LayoutGridField: LayoutGridField,
    DetectorHardwareField: DetectorHardwareField,
    ReplaceRulesField: ReplaceRulesField,
    CameraInputsField: CameraInputsField,
  },
};
