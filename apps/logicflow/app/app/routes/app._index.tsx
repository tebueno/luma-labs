import type { ActionFunctionArgs, LoaderFunctionArgs } from "@remix-run/node";
import { json } from "@remix-run/node";
import { useActionData, useLoaderData, useSubmit } from "@remix-run/react";
import {
  Page,
  Layout,
  Card,
  Button,
  BlockStack,
  Text,
  TextField,
  Select,
  Banner,
  InlineStack,
  Box,
} from "@shopify/polaris";
import { useState } from "react";
import { authenticate } from "../shopify.server";

// The metafield namespace and key for our rules config
const METAFIELD_NAMESPACE = "logicflow";
const METAFIELD_KEY = "rules_config";

export const loader = async ({ request }: LoaderFunctionArgs) => {
  const { admin } = await authenticate.admin(request);

  // Fetch current rules config from metafield
  const response = await admin.graphql(
    `#graphql
      query GetRulesConfig {
        currentAppInstallation {
          metafield(namespace: "${METAFIELD_NAMESPACE}", key: "${METAFIELD_KEY}") {
            value
          }
        }
      }
    `
  );

  const data = await response.json();
  const configValue = data.data?.currentAppInstallation?.metafield?.value;
  
  let config = null;
  if (configValue) {
    try {
      config = JSON.parse(configValue);
    } catch (e) {
      console.error("Failed to parse config:", e);
    }
  }

  return json({ config });
};

export const action = async ({ request }: ActionFunctionArgs) => {
  const { admin } = await authenticate.admin(request);
  const formData = await request.formData();
  const actionType = formData.get("action");

  // First, get the shop ID
  const shopResponse = await admin.graphql(
    `#graphql
      query GetShop {
        shop {
          id
        }
      }
    `
  );
  const shopData = await shopResponse.json();
  const ownerId = shopData.data?.shop?.id;

  if (!ownerId) {
    return json({ success: false, error: "Could not get shop ID" });
  }

  if (actionType === "save") {
    const field = formData.get("field") as string;
    const operator = formData.get("operator") as string;
    const value = formData.get("value") as string;
    const errorMessage = formData.get("errorMessage") as string;

    // Build the rules config
    const config = {
      version: "1.0",
      total_complexity: 1,
      rules: [
        {
          id: "rule_1",
          name: "Test Rule",
          complexity: 1,
          enabled: true,
          error_message: errorMessage || "Checkout blocked by LogicFlow",
          conditions: {
            operator: "AND",
            criteria: [
              {
                field: field,
                operator: operator,
                value: parseValue(value, operator),
                is_preset: false,
              },
            ],
          },
        },
      ],
    };

    // Save to app metafield
    const response = await admin.graphql(
      `#graphql
        mutation SetRulesConfig($metafields: [MetafieldsSetInput!]!) {
          metafieldsSet(metafields: $metafields) {
            metafields {
              id
              namespace
              key
              value
            }
            userErrors {
              field
              message
            }
          }
        }
      `,
      {
        variables: {
          metafields: [
            {
              namespace: METAFIELD_NAMESPACE,
              key: METAFIELD_KEY,
              type: "json",
              value: JSON.stringify(config),
              ownerId: ownerId,
            },
          ],
        },
      }
    );

    const result = await response.json();
    
    if (result.data?.metafieldsSet?.userErrors?.length > 0) {
      return json({ 
        success: false, 
        error: result.data.metafieldsSet.userErrors[0].message 
      });
    }

    return json({ success: true, config });
  }

  if (actionType === "clear") {
    // Clear the metafield
    const response = await admin.graphql(
      `#graphql
        mutation SetRulesConfig($metafields: [MetafieldsSetInput!]!) {
          metafieldsSet(metafields: $metafields) {
            metafields {
              id
            }
            userErrors {
              field
              message
            }
          }
        }
      `,
      {
        variables: {
          metafields: [
            {
              namespace: METAFIELD_NAMESPACE,
              key: METAFIELD_KEY,
              type: "json",
              value: JSON.stringify({ version: "1.0", rules: [] }),
              ownerId: ownerId,
            },
          ],
        },
      }
    );

    return json({ success: true, cleared: true });
  }

  return json({ success: false });
};

function parseValue(value: string, operator: string): number | string {
  if (["GREATER_THAN", "LESS_THAN", "GREATER_THAN_OR_EQUAL", "LESS_THAN_OR_EQUAL"].includes(operator)) {
    return parseFloat(value) || 0;
  }
  return value;
}

export default function Index() {
  const { config } = useLoaderData<typeof loader>();
  const actionData = useActionData<typeof action>();
  const submit = useSubmit();

  const [field, setField] = useState("cart.total");
  const [operator, setOperator] = useState("GREATER_THAN");
  const [value, setValue] = useState("100");
  const [errorMessage, setErrorMessage] = useState("Your cart total exceeds our limit.");

  const fieldOptions = [
    { label: "Cart Total ($)", value: "cart.total" },
    { label: "Cart Quantity", value: "cart.quantity" },
    { label: "Cart Weight", value: "cart.total_weight" },
    { label: "Shipping Country Code", value: "shipping_address.country_code" },
    { label: "Shipping Province Code", value: "shipping_address.province_code" },
    { label: "Shipping ZIP", value: "shipping_address.zip" },
  ];

  const operatorOptions = [
    { label: "Greater Than", value: "GREATER_THAN" },
    { label: "Less Than", value: "LESS_THAN" },
    { label: "Equals", value: "EQUALS" },
    { label: "Not Equals", value: "NOT_EQUALS" },
    { label: "Contains", value: "CONTAINS" },
  ];

  const handleSave = () => {
    const formData = new FormData();
    formData.append("action", "save");
    formData.append("field", field);
    formData.append("operator", operator);
    formData.append("value", value);
    formData.append("errorMessage", errorMessage);
    submit(formData, { method: "post" });
  };

  const handleClear = () => {
    const formData = new FormData();
    formData.append("action", "clear");
    submit(formData, { method: "post" });
  };

  const hasActiveRule = config?.rules?.length > 0 && config.rules[0].enabled;

  return (
    <Page title="LogicFlow">
      <BlockStack gap="500">
        {actionData?.success && (
          <Banner tone="success" onDismiss={() => {}}>
            {actionData.cleared ? "Rules cleared!" : "Rule saved successfully!"}
          </Banner>
        )}

        {actionData?.error && (
          <Banner tone="critical" onDismiss={() => {}}>
            Error: {actionData.error}
          </Banner>
        )}

        <Layout>
          <Layout.Section>
            <Card>
              <BlockStack gap="400">
                <Text as="h2" variant="headingMd">
                  Create a Validation Rule
                </Text>
                <Text as="p" variant="bodyMd" tone="subdued">
                  This is a minimal vertical slice. Create ONE rule to test the
                  end-to-end flow.
                </Text>

                <Select
                  label="If this field..."
                  options={fieldOptions}
                  value={field}
                  onChange={setField}
                />

                <Select
                  label="...matches this condition..."
                  options={operatorOptions}
                  value={operator}
                  onChange={setOperator}
                />

                <TextField
                  label="...with this value..."
                  value={value}
                  onChange={setValue}
                  autoComplete="off"
                  helpText={
                    field.includes("total") || field.includes("quantity") || field.includes("weight")
                      ? "Enter a number"
                      : "Enter text to match"
                  }
                />

                <TextField
                  label="Then show this error message"
                  value={errorMessage}
                  onChange={setErrorMessage}
                  autoComplete="off"
                  multiline={2}
                />

                <InlineStack gap="300">
                  <Button variant="primary" onClick={handleSave}>
                    Save Rule
                  </Button>
                  <Button onClick={handleClear} tone="critical">
                    Clear All Rules
                  </Button>
                </InlineStack>
              </BlockStack>
            </Card>
          </Layout.Section>

          <Layout.Section variant="oneThird">
            <BlockStack gap="400">
              <Card>
                <BlockStack gap="300">
                  <Text as="h2" variant="headingMd">
                    Status
                  </Text>
                  <Box
                    padding="300"
                    background={hasActiveRule ? "bg-surface-success" : "bg-surface-caution"}
                    borderRadius="200"
                  >
                    <Text as="p" variant="bodyMd">
                      {hasActiveRule
                        ? "✅ Rule Active"
                        : "⚠️ No Active Rules"}
                    </Text>
                  </Box>
                </BlockStack>
              </Card>

              {hasActiveRule && (
                <Card>
                  <BlockStack gap="300">
                    <Text as="h2" variant="headingMd">
                      Current Rule
                    </Text>
                    <Text as="p" variant="bodyMd" tone="subdued">
                      {config.rules[0].name}
                    </Text>
                    <Box padding="200" background="bg-surface-secondary" borderRadius="100">
                      <pre style={{ fontSize: "12px", margin: 0, whiteSpace: "pre-wrap" }}>
                        {JSON.stringify(config.rules[0].conditions, null, 2)}
                      </pre>
                    </Box>
                    <Text as="p" variant="bodySm">
                      Error: "{config.rules[0].error_message}"
                    </Text>
                  </BlockStack>
                </Card>
              )}

              <Card>
                <BlockStack gap="300">
                  <Text as="h2" variant="headingMd">
                    Test It
                  </Text>
                  <Text as="p" variant="bodyMd" tone="subdued">
                    1. Save a rule above
                  </Text>
                  <Text as="p" variant="bodyMd" tone="subdued">
                    2. Go to your store's checkout
                  </Text>
                  <Text as="p" variant="bodyMd" tone="subdued">
                    3. Try to checkout with a cart that matches your rule
                  </Text>
                  <Text as="p" variant="bodyMd" tone="subdued">
                    4. You should see your error message!
                  </Text>
                </BlockStack>
              </Card>
            </BlockStack>
          </Layout.Section>
        </Layout>
      </BlockStack>
    </Page>
  );
}

