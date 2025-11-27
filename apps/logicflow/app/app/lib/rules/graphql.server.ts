import { METAFIELD_NAMESPACE, METAFIELD_KEY } from "./constants";
import type { RulesConfig } from "./types";

// ============================================================================
// Types
// ============================================================================

type AdminGraphQL = {
  graphql: (query: string, options?: { variables?: Record<string, unknown> }) => Promise<Response>;
};

interface GraphQLResponse<T> {
  data?: T;
  errors?: Array<{ message: string }>;
}

// ============================================================================
// Queries
// ============================================================================

const GET_APP_INSTALLATION_QUERY = `#graphql
  query GetAppInstallation {
    currentAppInstallation {
      id
    }
  }
`;

const GET_RULES_CONFIG_QUERY = `#graphql
  query GetRulesConfig {
    currentAppInstallation {
      metafield(namespace: "${METAFIELD_NAMESPACE}", key: "${METAFIELD_KEY}") {
        value
      }
    }
  }
`;

const SET_RULES_CONFIG_MUTATION = `#graphql
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
`;

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Get the app installation ID (used as owner for metafields)
 */
export async function getAppInstallationId(admin: AdminGraphQL): Promise<string | null> {
  const response = await admin.graphql(GET_APP_INSTALLATION_QUERY);
  const data: GraphQLResponse<{
    currentAppInstallation: { id: string };
  }> = await response.json();
  
  return data.data?.currentAppInstallation?.id || null;
}

/**
 * Get the current rules configuration from metafield
 */
export async function getRulesConfig(admin: AdminGraphQL): Promise<RulesConfig | null> {
  const response = await admin.graphql(GET_RULES_CONFIG_QUERY);
  const data: GraphQLResponse<{
    currentAppInstallation: {
      metafield: { value: string } | null;
    };
  }> = await response.json();

  const configValue = data.data?.currentAppInstallation?.metafield?.value;
  
  if (!configValue) {
    return null;
  }

  try {
    return JSON.parse(configValue) as RulesConfig;
  } catch (e) {
    console.error("Failed to parse rules config:", e);
    return null;
  }
}

/**
 * Get existing config or return default empty config
 */
export async function getExistingConfig(admin: AdminGraphQL): Promise<RulesConfig> {
  const config = await getRulesConfig(admin);
  return config || {
    version: "1.0",
    total_complexity: 0,
    rules: [],
  };
}

/**
 * Save rules configuration to metafield
 */
export async function saveRulesConfig(
  admin: AdminGraphQL,
  ownerId: string,
  config: RulesConfig
): Promise<{ success: boolean; error?: string }> {
  const response = await admin.graphql(SET_RULES_CONFIG_MUTATION, {
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
  });

  const result: GraphQLResponse<{
    metafieldsSet: {
      metafields: Array<{ id: string }>;
      userErrors: Array<{ field: string; message: string }>;
    };
  }> = await response.json();

  if (result.data?.metafieldsSet?.userErrors?.length) {
    return {
      success: false,
      error: result.data.metafieldsSet.userErrors[0].message,
    };
  }

  return { success: true };
}

