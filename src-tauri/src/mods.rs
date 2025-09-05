use serde::Serialize;
use std::path::PathBuf;

#[derive(Serialize)]
pub struct ModInfo {
    pub name: String,
    pub path: String,
    pub file: String,
}

#[tauri::command]
pub fn list_mods() -> Result<Vec<ModInfo>, String> {
    // 获取用户主目录并构建 Documents 路径（兼容 Windows 与其他平台）
    let docs_base: Option<PathBuf> = if cfg!(target_os = "windows") {
        std::env::var("USERPROFILE").ok().map(PathBuf::from)
    } else {
        std::env::var("HOME").ok().map(PathBuf::from)
    };

    match &docs_base {
        Some(p) => println!("[list_mods] document_dir base: {}", p.display()),
        None => println!("[list_mods] document_dir not found"),
    }

    let mut mods = Vec::new();

    let docs = match docs_base {
        Some(mut p) => {
            p.push("Documents");
            p.push("Paradox Interactive");
            p.push("Hearts of Iron IV");
            p.push("mod");
            println!("[list_mods] looking in: {}", p.display());
            p
        }
        None => {
            println!("[list_mods] no docs base, returning empty list");
            return Ok(mods);
        }
    };

    if !docs.exists() {
        println!("[list_mods] path does not exist: {}", docs.display());
        return Ok(mods);
    }

    println!("[list_mods] scanning directory...");
    for entry in std::fs::read_dir(&docs).map_err(|e| e.to_string())? {
        let entry = entry.map_err(|e| e.to_string())?;
        let path = entry.path();
        if path.is_file() {
            if let Some(ext) = path.extension().and_then(|s| s.to_str()) {
                if ext.eq_ignore_ascii_case("mod") {
                    let file_name = path.file_name().and_then(|s| s.to_str()).unwrap_or_default().to_string();
                    println!("[list_mods] found .mod file: {}", file_name);

                    let content = std::fs::read_to_string(&path).unwrap_or_default();

                    // 逐行解析，支持注释、单双引号和值中包含空格的情况
                    fn extract_value(content: &str, key: &str) -> Option<String> {
                        for raw_line in content.lines() {
                            let mut line = raw_line;
                            // 去掉行内注释（# 或 //）
                            if let Some(idx) = line.find('#') { line = &line[..idx]; }
                            if let Some(idx) = line.find("//") { line = &line[..idx]; }
                            let line = line.trim();
                            if line.is_empty() { continue; }
                            // 查找等号
                            if let Some(pos) = line.find('=') {
                                let left = line[..pos].trim();
                                if left.eq_ignore_ascii_case(key) {
                                    let mut val = line[pos+1..].trim();
                                    // 如果以引号开始，取匹配的引号包裹内容
                                    if (val.starts_with('"') && val.ends_with('"')) || (val.starts_with('\'') && val.ends_with('\'')) {
                                        // 去掉外侧引号
                                        val = &val[1..val.len()-1];
                                        return Some(val.to_string());
                                    }
                                    // 如果以引号开始但没有闭合，尝试在原内容中查找闭合引号
                                    if val.starts_with('"') || val.starts_with('\'') {
                                        let quote = val.chars().next().unwrap();
                                        // 拼接剩余行，查找闭��引号
                                        let mut accum = String::from(&val[1..]);
                                        // 继续读取后续行以找到闭合引号（保持简单：这里不实现跨行复杂情况）
                                        if let Some(end_pos) = accum.find(quote) {
                                            return Some(accum[..end_pos].to_string());
                                        }
                                    }
                                    // 否则取到行尾并去除可能的分号或逗号
                                    let cleaned = val.trim().trim_end_matches(',').trim().to_string();
                                    return Some(cleaned);
                                }
                            }
                        }
                        None
                    }

                    let name = extract_value(&content, "name").unwrap_or_else(|| file_name.clone());
                    let pth = extract_value(&content, "path").unwrap_or_default();
                    println!("[list_mods] parsed: name='{}' path='{}'", name, pth);

                    mods.push(ModInfo { name, path: pth, file: file_name });
                }
            }
        }
    }

    println!("[list_mods] total mods discovered: {}", mods.len());
    Ok(mods)
}
