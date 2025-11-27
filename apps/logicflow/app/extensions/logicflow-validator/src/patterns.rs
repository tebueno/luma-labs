//! Simple pattern matching (regex-free for smaller WASM size)

/// Check if text contains a PO Box pattern
pub fn is_po_box(text: &str) -> bool {
    let lower = text.to_lowercase();
    lower.contains("po box") || 
    lower.contains("p.o. box") || 
    lower.contains("p o box") ||
    lower.contains("post office box")
}

/// Get a preset pattern checker by name
pub fn check_preset(name: &str, text: &str) -> bool {
    match name {
        "po_box" => is_po_box(text),
        _ => false,
    }
}
