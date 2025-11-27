import { Modal, BlockStack, TextField, Select, Checkbox } from "@shopify/polaris";
import { FIELD_OPTIONS, OPERATOR_OPTIONS } from "../constants";
import type { Rule, RuleFormState } from "../types";

interface RuleModalProps {
  open: boolean;
  editingRule: Rule | null;
  formState: RuleFormState;
  onNameChange: (value: string) => void;
  onFieldChange: (value: string) => void;
  onOperatorChange: (value: string) => void;
  onValueChange: (value: string) => void;
  onErrorMessageChange: (value: string) => void;
  onEnabledChange: (value: boolean) => void;
  onSave: () => void;
  onClose: () => void;
}

export function RuleModal({
  open,
  editingRule,
  formState,
  onNameChange,
  onFieldChange,
  onOperatorChange,
  onValueChange,
  onErrorMessageChange,
  onEnabledChange,
  onSave,
  onClose,
}: RuleModalProps) {
  const isNumericField =
    formState.field.includes("total") ||
    formState.field.includes("quantity") ||
    formState.field.includes("weight");

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={editingRule ? "Edit Rule" : "Create Rule"}
      primaryAction={{
        content: "Save",
        onAction: onSave,
      }}
      secondaryActions={[
        {
          content: "Cancel",
          onAction: onClose,
        },
      ]}
    >
      <Modal.Section>
        <BlockStack gap="400">
          <TextField
            label="Rule Name"
            value={formState.name}
            onChange={onNameChange}
            autoComplete="off"
            placeholder="e.g., Block high-value orders"
          />

          <Select
            label="If this field..."
            options={[...FIELD_OPTIONS]}
            value={formState.field}
            onChange={onFieldChange}
          />

          <Select
            label="...matches this condition..."
            options={[...OPERATOR_OPTIONS]}
            value={formState.operator}
            onChange={onOperatorChange}
          />

          <TextField
            label="...with this value"
            value={formState.value}
            onChange={onValueChange}
            autoComplete="off"
            helpText={isNumericField ? "Enter a number" : "Enter text to match"}
          />

          <TextField
            label="Then show this error message"
            value={formState.errorMessage}
            onChange={onErrorMessageChange}
            autoComplete="off"
            multiline={2}
            helpText="This message will be shown to customers at checkout"
          />

          <Checkbox
            label="Rule is active"
            checked={formState.enabled}
            onChange={onEnabledChange}
          />
        </BlockStack>
      </Modal.Section>
    </Modal>
  );
}

