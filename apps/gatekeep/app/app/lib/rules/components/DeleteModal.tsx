import { Modal, Text } from "@shopify/polaris";

interface DeleteModalProps {
  open: boolean;
  onConfirm: () => void;
  onClose: () => void;
}

export function DeleteModal({ open, onConfirm, onClose }: DeleteModalProps) {
  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Delete Rule"
      primaryAction={{
        content: "Delete",
        destructive: true,
        onAction: onConfirm,
      }}
      secondaryActions={[
        {
          content: "Cancel",
          onAction: onClose,
        },
      ]}
    >
      <Modal.Section>
        <Text as="p">
          Are you sure you want to delete this rule? This action cannot be
          undone.
        </Text>
      </Modal.Section>
    </Modal>
  );
}

