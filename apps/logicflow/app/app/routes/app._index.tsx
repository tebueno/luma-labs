import type { ActionFunctionArgs, LoaderFunctionArgs } from "@remix-run/node";
import { json } from "@remix-run/node";
import { useActionData, useLoaderData, useSubmit } from "@remix-run/react";
import { Page, Layout, BlockStack, Banner } from "@shopify/polaris";
import { PlusIcon } from "@shopify/polaris-icons";
import { useCallback, useState, useEffect } from "react";
import { authenticate } from "../shopify.server";

// Rules modules
import type {
  Rule,
  RulesConfig,
  ConditionGroup,
  ActionResponse,
  ConditionFormData,
} from "~/lib/rules/types";
import { useRuleForm, useDeleteConfirmation } from "~/lib/rules/hooks";
import {
  generateRuleId,
  parseValue,
  calculateComplexity,
  calculateTotalComplexity,
} from "~/lib/rules/utils";
import {
  getRulesConfig,
  getAppInstallationId,
  getExistingConfig,
  saveRulesConfig,
} from "~/lib/rules/graphql.server";
import {
  RuleList,
  RuleModal,
  DeleteModal,
  StatusSidebar,
} from "~/lib/rules/components";

// ============================================================================
// Loader
// ============================================================================

export const loader = async ({ request }: LoaderFunctionArgs) => {
  const { admin } = await authenticate.admin(request);
  const config = await getRulesConfig(admin);
  return json({ config });
};

// ============================================================================
// Action
// ============================================================================

export const action = async ({ request }: ActionFunctionArgs) => {
  const { admin } = await authenticate.admin(request);
  const formData = await request.formData();
  const actionType = formData.get("action") as string;

  // Get owner ID for metafield operations
  const ownerId = await getAppInstallationId(admin);
  if (!ownerId) {
    return json<ActionResponse>({
      success: false,
      error: "Could not get app installation ID",
    });
  }

  // Get existing config
  const existingConfig = await getExistingConfig(admin);

  // Handle create/update
  if (actionType === "create" || actionType === "update") {
    const ruleId = formData.get("ruleId") as string;
    const name = formData.get("name") as string;
    const conditionsJson = formData.get("conditions") as string;
    const logicalOperator = formData.get("logicalOperator") as "AND" | "OR";
    const errorMessage = formData.get("errorMessage") as string;
    const enabled = formData.get("enabled") === "true";

    // Parse conditions from JSON
    let formConditions: ConditionFormData[] = [];
    try {
      formConditions = JSON.parse(conditionsJson);
    } catch (e) {
      return json<ActionResponse>({
        success: false,
        error: "Invalid conditions format",
      });
    }

    // Build condition group from form data
    const conditions: ConditionGroup = {
      operator: logicalOperator || "AND",
      criteria: formConditions.map((c) => ({
        field: c.field,
        operator: c.operator,
        value: parseValue(c.value, c.operator),
        is_preset: false,
      })),
    };

    const newRule: Rule = {
      id: actionType === "create" ? generateRuleId() : ruleId,
      name: name || "Untitled Rule",
      complexity: calculateComplexity(conditions),
      enabled,
      error_message: errorMessage || "Checkout blocked by LogicFlow",
      conditions,
    };

    const updatedRules =
      actionType === "create"
        ? [...existingConfig.rules, newRule]
        : existingConfig.rules.map((rule) =>
            rule.id === ruleId ? newRule : rule
          );

    const config: RulesConfig = {
      version: "1.0",
      total_complexity: calculateTotalComplexity(updatedRules),
      rules: updatedRules,
    };

    const result = await saveRulesConfig(admin, ownerId, config);
    if (!result.success) {
      return json<ActionResponse>({ success: false, error: result.error! });
    }

    return json<ActionResponse>({ success: true, action: actionType, config });
  }

  // Handle delete
  if (actionType === "delete") {
    const ruleId = formData.get("ruleId") as string;
    const updatedRules = existingConfig.rules.filter(
      (rule) => rule.id !== ruleId
    );

    const config: RulesConfig = {
      version: "1.0",
      total_complexity: calculateTotalComplexity(updatedRules),
      rules: updatedRules,
    };

    const result = await saveRulesConfig(admin, ownerId, config);
    if (!result.success) {
      return json<ActionResponse>({ success: false, error: result.error! });
    }

    return json<ActionResponse>({ success: true, action: "delete", config });
  }

  // Handle toggle
  if (actionType === "toggle") {
    const ruleId = formData.get("ruleId") as string;
    const updatedRules = existingConfig.rules.map((rule) =>
      rule.id === ruleId ? { ...rule, enabled: !rule.enabled } : rule
    );

    const config: RulesConfig = {
      ...existingConfig,
      rules: updatedRules,
    };

    const result = await saveRulesConfig(admin, ownerId, config);
    if (!result.success) {
      return json<ActionResponse>({ success: false, error: result.error! });
    }

    return json<ActionResponse>({ success: true, action: "toggle", config });
  }

  // Handle clear
  if (actionType === "clear") {
    const config: RulesConfig = {
      version: "1.0",
      total_complexity: 0,
      rules: [],
    };

    await saveRulesConfig(admin, ownerId, config);
    return json<ActionResponse>({ success: true, action: "clear" });
  }

  return json<ActionResponse>({ success: false, error: "Unknown action" });
};

// ============================================================================
// Component
// ============================================================================

export default function RulesPage() {
  const { config } = useLoaderData<typeof loader>();
  const actionData = useActionData<typeof action>();
  const submit = useSubmit();

  const rules = config?.rules || [];
  const totalComplexity = config?.total_complexity || 0;

  // Banner dismiss state
  const [showSuccessBanner, setShowSuccessBanner] = useState(false);
  const [showErrorBanner, setShowErrorBanner] = useState(false);

  // Show banners when actionData changes
  useEffect(() => {
    if (actionData?.success && "action" in actionData) {
      setShowSuccessBanner(true);
    }
    if (actionData && "error" in actionData && actionData.error) {
      setShowErrorBanner(true);
    }
  }, [actionData]);

  // Form and modal state
  const {
    formState,
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
  } = useRuleForm();

  // Delete confirmation state
  const { deleteConfirmId, openDeleteConfirm, closeDeleteConfirm } =
    useDeleteConfirmation();

  // Action handlers
  const handleSaveRule = useCallback(() => {
    const data = new FormData();
    data.append("action", editingRule ? "update" : "create");
    if (editingRule) {
      data.append("ruleId", editingRule.id);
    }
    data.append("name", formState.name);
    data.append("conditions", JSON.stringify(formState.conditions));
    data.append("logicalOperator", formState.logicalOperator);
    data.append("errorMessage", formState.errorMessage);
    data.append("enabled", String(formState.enabled));
    submit(data, { method: "post" });
    closeModal();
  }, [editingRule, formState, submit, closeModal]);

  const handleToggleRule = useCallback(
    (ruleId: string) => {
      const data = new FormData();
      data.append("action", "toggle");
      data.append("ruleId", ruleId);
      submit(data, { method: "post" });
    },
    [submit]
  );

  const handleDeleteRule = useCallback(() => {
    if (!deleteConfirmId) return;
    const data = new FormData();
    data.append("action", "delete");
    data.append("ruleId", deleteConfirmId);
    submit(data, { method: "post" });
    closeDeleteConfirm();
  }, [deleteConfirmId, submit, closeDeleteConfirm]);

  const handleClearAll = useCallback(() => {
    const data = new FormData();
    data.append("action", "clear");
    submit(data, { method: "post" });
  }, [submit]);

  return (
    <Page
      title="LogicFlow Rules"
      primaryAction={{
        content: "Add Rule",
        icon: PlusIcon,
        onAction: openCreateModal,
      }}
    >
      <BlockStack gap="500">
        {/* Success Banner */}
        {showSuccessBanner && actionData?.success && "action" in actionData && (
          <Banner tone="success" onDismiss={() => setShowSuccessBanner(false)}>
            {actionData.action === "create" && "Rule created successfully!"}
            {actionData.action === "update" && "Rule updated successfully!"}
            {actionData.action === "delete" && "Rule deleted successfully!"}
            {actionData.action === "toggle" && "Rule status updated!"}
            {actionData.action === "clear" && "All rules cleared!"}
          </Banner>
        )}

        {/* Error Banner */}
        {showErrorBanner &&
          actionData &&
          "error" in actionData &&
          actionData.error && (
            <Banner tone="critical" onDismiss={() => setShowErrorBanner(false)}>
              Error: {actionData.error}
            </Banner>
          )}

        <Layout>
          {/* Main Content */}
          <Layout.Section>
            <RuleList
              rules={rules}
              onEdit={openEditModal}
              onToggle={handleToggleRule}
              onDelete={openDeleteConfirm}
              onAddRule={openCreateModal}
              onClearAll={handleClearAll}
            />
          </Layout.Section>

          {/* Sidebar */}
          <Layout.Section variant="oneThird">
            <StatusSidebar rules={rules} totalComplexity={totalComplexity} />
          </Layout.Section>
        </Layout>

        {/* Rule Editor Modal */}
        <RuleModal
          open={isModalOpen}
          editingRule={editingRule}
          formState={formState}
          onNameChange={setName}
          onConditionsChange={setConditions}
          onLogicalOperatorChange={setLogicalOperator}
          onErrorMessageChange={setErrorMessage}
          onEnabledChange={setEnabled}
          onSave={handleSaveRule}
          onClose={closeModal}
        />

        {/* Delete Confirmation Modal */}
        <DeleteModal
          open={deleteConfirmId !== null}
          onConfirm={handleDeleteRule}
          onClose={closeDeleteConfirm}
        />
      </BlockStack>
    </Page>
  );
}
