use keyring::Entry;

#[tauri::command]
fn save_key(key: String, value: String) -> Result<(), String> {
    Entry::new("NovelPro", &key)
        .map_err(|e| e.to_string())?
        .set_password(&value)
        .map_err(|e| e.to_string())
}

#[tauri::command]
fn get_key(key: String) -> Result<String, String> {
    Entry::new("NovelPro", &key)
        .map_err(|e| e.to_string())?
        .get_password()
        .map_err(|e| e.to_string())
}

#[tauri::command]
fn delete_key(key: String) -> Result<(), String> {
    Entry::new("NovelPro", &key)
        .map_err(|e| e.to_string())?
        .delete_password()
        .map_err(|e| e.to_string())
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
  tauri::Builder::default()
    .setup(|app| {
      if cfg!(debug_assertions) {
        app.handle().plugin(
          tauri_plugin_log::Builder::default()
            .level(log::LevelFilter::Info)
            .build(),
        )?;
      }
      Ok(())
    })
    .invoke_handler(tauri::generate_handler![save_key, get_key, delete_key])
    .run(tauri::generate_context!())
    .expect("error while running tauri application");
}
