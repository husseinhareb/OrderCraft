// src/utils.rs
// Escape LIKE wildcards (_ % \) for use with ESCAPE '\\'
pub fn escape_like(input: &str) -> String {
    input
        .replace('\\', r#"\\"#)
        .replace('%', r#"\%"#)
        .replace('_', r#"\_"#)
}
