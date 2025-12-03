//! Pre-built regex patterns for common validation needs.
//!
//! These patterns are:
//! 1. Pre-compiled for performance (via lazy_static)
//! 2. Benchmarked to ensure they meet performance requirements
//! 3. Guaranteed to be safe (no catastrophic backtracking)

use lazy_static::lazy_static;
use regex::Regex;

lazy_static! {
    /// Detects PO Box addresses in various formats:
    /// - "PO Box 123"
    /// - "P.O. Box 456"
    /// - "Post Office Box 789"
    /// - "P O Box 101"
    pub static ref PO_BOX: Regex = Regex::new(
        r"(?i)\b(p\.?\s*o\.?\s*box|post\s*office\s*box)\b"
    ).expect("Invalid PO Box regex");

    /// Validates UK postcodes in standard format:
    /// - "SW1A 1AA" (with space)
    /// - "SW1A1AA" (without space)
    pub static ref UK_POSTCODE: Regex = Regex::new(
        r"(?i)^[A-Z]{1,2}\d[A-Z\d]?\s*\d[A-Z]{2}$"
    ).expect("Invalid UK postcode regex");

    /// Validates US ZIP codes:
    /// - "90210" (5-digit)
    /// - "90210-1234" (ZIP+4)
    pub static ref US_ZIP: Regex = Regex::new(
        r"^\d{5}(-\d{4})?$"
    ).expect("Invalid US ZIP regex");

    /// Validates Canadian postal codes:
    /// - "K1A 0B1" (with space)
    /// - "K1A0B1" (without space)
    pub static ref CA_POSTAL: Regex = Regex::new(
        r"(?i)^[A-Z]\d[A-Z]\s*\d[A-Z]\d$"
    ).expect("Invalid CA postal code regex");

    /// Basic email format validation.
    /// Note: This is intentionally simple; full RFC 5322 compliance is not needed.
    pub static ref EMAIL_BASIC: Regex = Regex::new(
        r"^[^\s@]+@[^\s@]+\.[^\s@]+$"
    ).expect("Invalid email regex");

    /// US phone number formats:
    /// - "(555) 123-4567"
    /// - "555-123-4567"
    /// - "5551234567"
    /// - "+1 555 123 4567"
    pub static ref US_PHONE: Regex = Regex::new(
        r"^(\+1[-.\s]?)?(\(?\d{3}\)?[-.\s]?)?\d{3}[-.\s]?\d{4}$"
    ).expect("Invalid US phone regex");

    /// Detects common profanity (basic word list).
    /// In production, this would be a more comprehensive list.
    pub static ref PROFANITY: Regex = Regex::new(
        r"(?i)\b(badword1|badword2|offensive)\b"
    ).expect("Invalid profanity regex");

    /// Detects numeric-only strings (no letters).
    pub static ref NUMERIC_ONLY: Regex = Regex::new(
        r"^\d+$"
    ).expect("Invalid numeric regex");

    /// Detects strings with special characters that might indicate fraud.
    pub static ref SUSPICIOUS_CHARS: Regex = Regex::new(
        r"[<>{}|\\^~\[\]`]"
    ).expect("Invalid suspicious chars regex");
}

/// Get a pre-built regex pattern by name.
///
/// Returns `None` if the pattern name is not recognized.
pub fn get_preset_pattern(name: &str) -> Option<&'static Regex> {
    match name {
        "po_box" => Some(&PO_BOX),
        "uk_postcode" => Some(&UK_POSTCODE),
        "us_zip" => Some(&US_ZIP),
        "ca_postal" => Some(&CA_POSTAL),
        "email_basic" => Some(&EMAIL_BASIC),
        "us_phone" => Some(&US_PHONE),
        "profanity" => Some(&PROFANITY),
        "numeric_only" => Some(&NUMERIC_ONLY),
        "suspicious_chars" => Some(&SUSPICIOUS_CHARS),
        _ => None,
    }
}

/// Get all available preset pattern names.
pub fn list_preset_patterns() -> Vec<&'static str> {
    vec![
        "po_box",
        "uk_postcode",
        "us_zip",
        "ca_postal",
        "email_basic",
        "us_phone",
        "profanity",
        "numeric_only",
        "suspicious_chars",
    ]
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_po_box_patterns() {
        // Should match
        assert!(PO_BOX.is_match("PO Box 123"));
        assert!(PO_BOX.is_match("P.O. Box 456"));
        assert!(PO_BOX.is_match("P O Box 789"));
        assert!(PO_BOX.is_match("Post Office Box 101"));
        assert!(PO_BOX.is_match("po box 202"));
        assert!(PO_BOX.is_match("123 Main St, PO Box 303"));

        // Should not match
        assert!(!PO_BOX.is_match("123 Main Street"));
        assert!(!PO_BOX.is_match("456 Oak Avenue"));
        assert!(!PO_BOX.is_match("Boxwood Lane"));
    }

    #[test]
    fn test_uk_postcode() {
        // Should match
        assert!(UK_POSTCODE.is_match("SW1A 1AA"));
        assert!(UK_POSTCODE.is_match("SW1A1AA"));
        assert!(UK_POSTCODE.is_match("EC1A 1BB"));
        assert!(UK_POSTCODE.is_match("M1 1AE"));
        assert!(UK_POSTCODE.is_match("B33 8TH"));

        // Should not match
        assert!(!UK_POSTCODE.is_match("12345"));
        assert!(!UK_POSTCODE.is_match("INVALID"));
        assert!(!UK_POSTCODE.is_match("90210"));
    }

    #[test]
    fn test_us_zip() {
        // Should match
        assert!(US_ZIP.is_match("90210"));
        assert!(US_ZIP.is_match("90210-1234"));
        assert!(US_ZIP.is_match("00000"));

        // Should not match
        assert!(!US_ZIP.is_match("9021"));
        assert!(!US_ZIP.is_match("902101"));
        assert!(!US_ZIP.is_match("ABCDE"));
        assert!(!US_ZIP.is_match("90210-123"));
    }

    #[test]
    fn test_ca_postal() {
        // Should match
        assert!(CA_POSTAL.is_match("K1A 0B1"));
        assert!(CA_POSTAL.is_match("K1A0B1"));
        assert!(CA_POSTAL.is_match("V6B 3K9"));

        // Should not match
        assert!(!CA_POSTAL.is_match("90210"));
        assert!(!CA_POSTAL.is_match("SW1A 1AA"));
    }

    #[test]
    fn test_email_basic() {
        // Should match
        assert!(EMAIL_BASIC.is_match("test@example.com"));
        assert!(EMAIL_BASIC.is_match("user.name@domain.co.uk"));

        // Should not match
        assert!(!EMAIL_BASIC.is_match("invalid"));
        assert!(!EMAIL_BASIC.is_match("@nodomain.com"));
        assert!(!EMAIL_BASIC.is_match("noat.com"));
    }

    #[test]
    fn test_us_phone() {
        // Should match
        assert!(US_PHONE.is_match("555-123-4567"));
        assert!(US_PHONE.is_match("(555) 123-4567"));
        assert!(US_PHONE.is_match("5551234567"));
        assert!(US_PHONE.is_match("+1 555 123 4567"));
        assert!(US_PHONE.is_match("123-4567"));

        // Should not match
        assert!(!US_PHONE.is_match("123"));
        assert!(!US_PHONE.is_match("abcdefghij"));
    }

    #[test]
    fn test_get_preset_pattern() {
        assert!(get_preset_pattern("po_box").is_some());
        assert!(get_preset_pattern("uk_postcode").is_some());
        assert!(get_preset_pattern("nonexistent").is_none());
    }

    #[test]
    fn test_list_preset_patterns() {
        let patterns = list_preset_patterns();
        assert!(patterns.contains(&"po_box"));
        assert!(patterns.contains(&"uk_postcode"));
        assert!(patterns.len() >= 9);
    }

    // Performance sanity check
    #[test]
    fn test_regex_performance() {
        let test_strings: Vec<&str> = vec![
            "123 Main Street",
            "PO Box 456",
            "P.O. Box 789",
            "456 Oak Avenue Apt 2B",
            "Post Office Box 123",
            "789 Pine Road",
            "555 Elm Drive",
            "321 Cedar Lane",
            "999 Maple Court",
            "100 Birch Way",
        ];

        let start = std::time::Instant::now();
        for _ in 0..1000 {
            for s in &test_strings {
                let _ = PO_BOX.is_match(s);
            }
        }
        let elapsed = start.elapsed();

        // 10,000 regex checks should complete in under 10ms
        assert!(
            elapsed.as_millis() < 10,
            "Regex too slow: {:?} for 10,000 checks",
            elapsed
        );
    }
}

