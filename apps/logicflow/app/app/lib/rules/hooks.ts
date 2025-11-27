import { useState, useCallback } from "react";
import type { Rule, RuleFormState } from "./types";
import { DEFAULT_FORM_STATE } from "./types";

// ============================================================================
// useRuleForm Hook
// ============================================================================

export interface UseRuleFormReturn {
  // Form state
  formState: RuleFormState;
  setName: (value: string) => void;
  setField: (value: string) => void;
  setOperator: (value: string) => void;
  setValue: (value: string) => void;
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
  const [field, setField] = useState(DEFAULT_FORM_STATE.field);
  const [operator, setOperator] = useState(DEFAULT_FORM_STATE.operator);
  const [value, setValue] = useState(DEFAULT_FORM_STATE.value);
  const [errorMessage, setErrorMessage] = useState(DEFAULT_FORM_STATE.errorMessage);
  const [enabled, setEnabled] = useState(DEFAULT_FORM_STATE.enabled);

  // Modal state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingRule, setEditingRule] = useState<Rule | null>(null);

  // Reset form to defaults
  const resetForm = useCallback(() => {
    setName(DEFAULT_FORM_STATE.name);
    setField(DEFAULT_FORM_STATE.field);
    setOperator(DEFAULT_FORM_STATE.operator);
    setValue(DEFAULT_FORM_STATE.value);
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

    // Extract first condition (simplified for MVP)
    const firstCondition = rule.conditions.criteria[0];
    if (firstCondition && "field" in firstCondition) {
      setField(firstCondition.field);
      setOperator(firstCondition.operator);
      setValue(String(firstCondition.value));
    }

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
      field,
      operator,
      value,
      errorMessage,
      enabled,
    },
    setName,
    setField,
    setOperator,
    setValue,
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

