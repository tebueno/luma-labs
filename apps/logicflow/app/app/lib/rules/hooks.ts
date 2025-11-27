import { useState, useCallback } from "react";
import type { Rule, RuleFormState, ConditionFormData } from "./types";
import { DEFAULT_FORM_STATE, createDefaultCondition } from "./types";

// ============================================================================
// useRuleForm Hook
// ============================================================================

export interface UseRuleFormReturn {
  // Form state
  formState: RuleFormState;
  setName: (value: string) => void;
  setConditions: (conditions: ConditionFormData[]) => void;
  setLogicalOperator: (operator: "AND" | "OR") => void;
  setErrorMessage: (value: string) => void;
  setEnabled: (value: boolean) => void;

  // Modal state
  isModalOpen: boolean;
  editingRule: Rule | null;

  // Actions
  openCreateModal: () => void;
  openEditModal: (rule: Rule) => void;
  closeModal: () => void;
  resetForm: () => void;
}

export function useRuleForm(): UseRuleFormReturn {
  // Form state
  const [name, setName] = useState(DEFAULT_FORM_STATE.name);
  const [conditions, setConditions] = useState<ConditionFormData[]>(
    DEFAULT_FORM_STATE.conditions
  );
  const [logicalOperator, setLogicalOperator] = useState<"AND" | "OR">(
    DEFAULT_FORM_STATE.logicalOperator
  );
  const [errorMessage, setErrorMessage] = useState(DEFAULT_FORM_STATE.errorMessage);
  const [enabled, setEnabled] = useState(DEFAULT_FORM_STATE.enabled);

  // Modal state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingRule, setEditingRule] = useState<Rule | null>(null);

  // Reset form to defaults
  const resetForm = useCallback(() => {
    setName(DEFAULT_FORM_STATE.name);
    setConditions([createDefaultCondition()]);
    setLogicalOperator(DEFAULT_FORM_STATE.logicalOperator);
    setErrorMessage(DEFAULT_FORM_STATE.errorMessage);
    setEnabled(DEFAULT_FORM_STATE.enabled);
    setEditingRule(null);
  }, []);

  // Open modal for creating new rule
  const openCreateModal = useCallback(() => {
    resetForm();
    setIsModalOpen(true);
  }, [resetForm]);

  // Open modal for editing existing rule
  const openEditModal = useCallback((rule: Rule) => {
    setEditingRule(rule);
    setName(rule.name);
    setEnabled(rule.enabled);
    setErrorMessage(rule.error_message);
    setLogicalOperator(rule.conditions.operator);

    // Convert conditions from rule format to form format
    const formConditions: ConditionFormData[] = rule.conditions.criteria
      .filter((c): c is { field: string; operator: string; value: string | number; is_preset: boolean } => 
        "field" in c
      )
      .map((c, index) => ({
        id: `cond_${Date.now()}_${index}`,
        field: c.field,
        operator: c.operator,
        value: String(c.value),
      }));

    // Ensure at least one condition
    if (formConditions.length === 0) {
      formConditions.push(createDefaultCondition());
    }

    setConditions(formConditions);
    setIsModalOpen(true);
  }, []);

  // Close modal
  const closeModal = useCallback(() => {
    setIsModalOpen(false);
    resetForm();
  }, [resetForm]);

  return {
    formState: {
      name,
      conditions,
      logicalOperator,
      errorMessage,
      enabled,
    },
    setName,
    setConditions,
    setLogicalOperator,
    setErrorMessage,
    setEnabled,
    isModalOpen,
    editingRule,
    openCreateModal,
    openEditModal,
    closeModal,
    resetForm,
  };
}

// ============================================================================
// useDeleteConfirmation Hook
// ============================================================================

export interface UseDeleteConfirmationReturn {
  deleteConfirmId: string | null;
  openDeleteConfirm: (ruleId: string) => void;
  closeDeleteConfirm: () => void;
}

export function useDeleteConfirmation(): UseDeleteConfirmationReturn {
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

  const openDeleteConfirm = useCallback((ruleId: string) => {
    setDeleteConfirmId(ruleId);
  }, []);

  const closeDeleteConfirm = useCallback(() => {
    setDeleteConfirmId(null);
  }, []);

  return {
    deleteConfirmId,
    openDeleteConfirm,
    closeDeleteConfirm,
  };
}
