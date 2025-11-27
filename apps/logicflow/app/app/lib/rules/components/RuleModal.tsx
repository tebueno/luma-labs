import { Modal, BlockStack, TextField, Checkbox } from "@shopify/polaris";
import type { Rule, RuleFormState, ConditionFormData } from "../types";
import { ConditionBuilder } from "./ConditionBuilder";

interface RuleModalProps {
  open: boolean;
  editingRule: Rule | null;
  formState: RuleFormState;
  onNameChange: (value: string) => void;
  onConditionsChange: (conditions: ConditionFormData[]) => void;
  onLogicalOperatorChange: (operator: "AND" | "OR") => void;
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
  onConditionsChange,
  onLogicalOperatorChange,
  onErrorMessageChange,
  onEnabledChange,
  onSave,
  onClose,
}: RuleModalProps) {
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
      size="large"
    >
      <Modal.Section>
        <BlockStack gap="500">
          <TextField
            label="Rule Name"
            value={formState.name}
            onChange={onNameChange}
            autoComplete="off"
            placeholder="e.g., Block high-value orders"
          />

          <ConditionBuilder
            conditions={formState.conditions}
            logicalOperator={formState.logicalOperator}
            onConditionsChange={onConditionsChange}
            onLogicalOperatorChange={onLogicalOperatorChange}
          />

          <TextField
            label="Error Message"
            value={formState.errorMessage}
            onChange={onErrorMessageChange}
            autoComplete="off"
            multiline={2}
            helpText="This message will be shown to customers at checkout when the rule blocks their order"
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
